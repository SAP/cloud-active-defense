package alert

import (
  "fmt"
	"math/rand"
	"slices"
	"strconv"
	"strings"
  "sundew/config_parser"

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
	//"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm/types"
	"time"
  "encoding/json"
)

type AlertParam struct {
  Filter config_parser.FilterType
  LogParameters map[string]string
}

type Alert struct {
  Time int64
	// attributes for correlation
	RequestID string
	// attributes for internal attribution
	DestinationIP string
	Url string
	Server string
	// attributes for external attribution
	SourceIP string
  Authenticated bool //Is the user autenticated
  Session string // session of the user
  Username string // username of the user
	Useragent string
	// request details
	Path string
	Method string
	// honeytoken details
	DecoyType string // https://owasp.org/www-pdf-archive/Owasp-appsensor-guide-v2.pdf Table 41
	DecoyKey string // decoy name
  DecoyExpectedValue string // decoy value
	DecoyInjectedValue string // received payload for decoy
	Severity string // CRITICAL - HIGH - MEDIUM
}

func SendAlert(filter *config_parser.FilterType, logParameters map[string]string, headers map[string]string) error {

  destinationIP, err := proxywasm.GetProperty([]string{"destination","address"})
	if (err != nil) {
		proxywasm.LogCriticalf("failed to fetch property: %v", err)
	}
  server, err := proxywasm.GetProperty([]string{"connection","requested_server_name"})
	if (err != nil) {
		proxywasm.LogCriticalf("failed to fetch property: %v", err)
	}
  if string(server[:]) == "" {
    server = []byte(logParameters["server"])
  }
  sourceIP, err := proxywasm.GetProperty([]string{"source", "address"})
	if (err != nil) {
		proxywasm.LogCriticalf("failed to fetch property: %v", err)
	}

  var decoyKey, decoyValue string
  if filter.Decoy.DynamicKey != "" {
    decoyKey = filter.Decoy.DynamicKey
  } else {
    decoyKey = filter.Decoy.Key
  }
  if filter.Decoy.DynamicValue != "" {
    decoyValue = filter.Decoy.DynamicValue
  } else {
    decoyValue = filter.Decoy.Value
  }

  alertContent := Alert{
    Time:                   time.Now().Unix(),
    RequestID:              headers["x-request-id"],
    DestinationIP:          string(destinationIP[:]),
    Url:                    truncate(headers[":authority"]),
    Server:                 truncate(string(server[:])),
    Useragent:              truncate(headers["user-agent"]),
    SourceIP:               string(sourceIP[:]),
    Path:                   truncate(headers[":path"]),
    Method:                 headers[":method"],
    DecoyType:              logParameters["alert"],
    DecoyKey:               decoyKey,
    DecoyExpectedValue:     decoyValue,
    DecoyInjectedValue:     logParameters["injected"],
    Severity:               filter.Detect.Alert.Severity,
  }
  if logParameters["session"] != "" {
    alertContent.Authenticated = true
    alertContent.Session = logParameters["session"]
  } else if _, exists := logParameters["session"]; exists {
    alertContent.Authenticated = false
  }
  if logParameters["username"] != "" {
    alertContent.Username = logParameters["username"]
  }

  jsonAlertContent, _ := json.MarshalIndent(&alertContent, "", " ")
  proxywasm.LogWarnf("\n!!!!! ALERT !!!!! DECOY TRIGGERED !!!!!\n %v", string(jsonAlertContent))
  //proxywasm.LogWarn("Alert called")
  // alertMessage := "["+filter.Detect.Alert.Severity+"]"
  // for _, logPar := range logParameters {
  //   alertMessage = alertMessage+"["+logPar+"]"
  // }
  // proxywasm.LogWarn("\n" + alertMessage + ": !!!!!!! ALERT !!!!!!! DECOY TRIGGERED !!!!!!! ALERT !!!!!!! DECOY TRIGGERED !!!!!!! ALERT !!!!!!!")
  return nil
}

func truncate(s string) string {
  maxLength := 300
  if len(s) > maxLength {
    return s[:maxLength]
  }
  return s
}

func SetAlertAction(alerts []AlertParam, config config_parser.ConfigType, headers map[string]string) map[string]string {
  updateBlocklist := map[string]string{ "delay": "now" ,"duration": "forever" }
  session := alerts[0].LogParameters["session"]
  if config.Respond != nil && len(config.Respond) != 0 {
    respond, err := getRespondPriority(config.Respond, session, headers["user-agent"])
    if err != nil {
      proxywasm.LogErrorf("error while setAlertAction: %s", err)
      return map[string]string{}
    }
    sources, err := getSource(respond.Source, session, headers["user-agent"])
    if err != nil {
      proxywasm.LogErrorf("error while setAlertAction: %s", err)
      return map[string]string{}
    }
    if len(sources) == 0 {
      return map[string]string{}
    }
    for _, source := range sources {
      updateBlocklist[source[0]] = source[1]
    }
    updateBlocklist["behavior"] = respond.Behavior
    if updateBlocklist["behavior"] == "throttle" {
      updateBlocklist["property"] = respond.Property
      if respond.Property == "" {
        updateBlocklist["property"] = "30-120"
      }
    }
    if respond.Delay != "" {
      splitDelay := strings.Split(respond.Delay, "-")
      if len(splitDelay) == 2 {
        min, _ := strconv.Atoi(splitDelay[0][:len(splitDelay[0])-1])
        max, _ := strconv.Atoi(splitDelay[1][:len(splitDelay[1])-1])
        updateBlocklist["delay"] = strconv.Itoa(rand.Intn(max - min + 1) + min) + string(respond.Delay[len(respond.Delay)-1])
      } else {
        updateBlocklist["delay"] = respond.Delay
      }
    }
    if respond.Duration != "" {
      updateBlocklist["duration"] = respond.Duration
    }
    updateBlocklist["timeDetected"] = time.Now().Format("01-02-2006 15:04:05")
  }
  if len(alerts) == 0 {
    return map[string]string{}
  }

  if alerts[0].Filter.Detect.Respond == nil || len(alerts[0].Filter.Detect.Respond) == 0 {
    //if not set by global config return empty
    if updateBlocklist["behavior"] == "" {
      return map[string]string{}
    }
    return updateBlocklist
  }
  updateBlocklist = map[string]string{ "delay": "now" ,"duration": "forever" }
  
  respond, err := getRespondPriority(alerts[0].Filter.Detect.Respond, alerts[0].LogParameters["session"], headers["user-agent"])
  if err != nil {
    proxywasm.LogErrorf("error while setAlertAction: %s", err)
    return map[string]string{}
  }
  sources, err := getSource(respond.Source, session, headers["user-agent"])
  if err != nil {
    proxywasm.LogErrorf("%s", err)
    return map[string]string{}
  }
  if len(sources) == 0 {
    return map[string]string{}
  }
  for _, source := range sources {
    updateBlocklist[source[0]] = source[1]
  }
  updateBlocklist["behavior"] = respond.Behavior
  if updateBlocklist["behavior"] == "throttle" {
    updateBlocklist["property"] = respond.Property
    if respond.Property == ""{
      updateBlocklist["property"] = "30-120"
    }
  }
  if respond.Delay != "" {
    updateBlocklist["delay"] = respond.Delay
  }
  if respond.Duration != "" {
    updateBlocklist["duration"] = respond.Duration
  }
  updateBlocklist["timeDetected"] = time.Now().Format("01-02-2006 15:04:05")
  return updateBlocklist
}

func getSource(configSource string, session string, userAgent string) (sourceResponse [][2]string, err error) {
  sourceResponse = [][2]string{}
  for _, source := range strings.Split(configSource, ",") {
    switch strings.ReplaceAll(source, " ", "") {
    case "ip":
      ip, err := proxywasm.GetProperty([]string{"source", "address"})
      if (err != nil) {
        err = fmt.Errorf("error while setAlertAction: update blocklist: failed to fetch property: %v", err)
      }
      if len(ip) == 0 {
        err = fmt.Errorf("cannot ban with this decoy because ip is missing")
      }
      sourceResponse = append(sourceResponse, [2]string{ "ip", strings.Split(string(ip), ":")[0] }) 
    case "session":
      if session == "" {
        err = fmt.Errorf("cannot ban with this decoy because session is not configured or is missing")
      }
      sourceResponse = append(sourceResponse, [2]string{ "session", session })
    case "userAgent":
      if userAgent == "" {
        sourceResponse = append(sourceResponse, [2]string{ "userAgent", "empty" })
        break;
      }
      sourceResponse = append(sourceResponse, [2]string{ "userAgent", userAgent })
    }
  }
    return sourceResponse, err
}

func getRespondPriority(configRespond []config_parser.RespondType, session string, userAgent string) (config_parser.RespondType, error) { 
  if len(configRespond) == 1 {
    return configRespond[0], nil
  }
  ip, err := proxywasm.GetProperty([]string{"source", "address"})
  if (err != nil) {
    return config_parser.RespondType{}, fmt.Errorf("getRespondPriority: update blocklist: failed to fetch property: %v", err)
  }
  var highestRespond config_parser.RespondType
  if len(configRespond) != 0 {
    for _, itemRespond := range configRespond {
      sources := strings.Split(strings.ReplaceAll(itemRespond.Source, " ", ""), ",")
      if containsSource(sources, "ip", string(ip)) && containsSource(sources, "session", session) && containsSource(sources, "userAgent", userAgent) {
        return itemRespond, nil
      }
      if containsSource(sources, "ip", string(ip)) && containsSource(sources, "session", session) && hasHighestPriority(sources, strings.Split(strings.ReplaceAll(highestRespond.Source, " ", ""), ",")) {
        highestRespond = itemRespond
      } else if containsSource(sources, "session", session) && containsSource(sources, "userAgent", userAgent) && hasHighestPriority(sources, strings.Split(strings.ReplaceAll(highestRespond.Source, " ", ""), ",")) {
        highestRespond = itemRespond
      } else if containsSource(sources, "session", session) && hasHighestPriority(sources, strings.Split(strings.ReplaceAll(highestRespond.Source, " ", ""), ",")) {
        highestRespond = itemRespond
      } else if containsSource(sources, "ip", string(ip)) && containsSource(sources, "userAgent", userAgent) && hasHighestPriority(sources, strings.Split(strings.ReplaceAll(highestRespond.Source, " ", ""), ",")) {
        highestRespond = itemRespond
      } else if containsSource(sources, "ip", string(ip)) && hasHighestPriority(sources, strings.Split(strings.ReplaceAll(highestRespond.Source, " ", ""), ",")) {
        highestRespond = itemRespond
      } else if containsSource(sources, "userAgent", userAgent) && hasHighestPriority(sources, strings.Split(strings.ReplaceAll(highestRespond.Source, " ", ""), ",")) {
        highestRespond = itemRespond
      }
    }
  }
  return highestRespond, nil
}

func containsSource(slice []string ,key string, value string) bool {
  return slices.Contains(slice, key) && value != ""
}

func hasHighestPriority(new, current []string) bool {
  newPriority := 99
  currentPriority := 99
  type priorityType struct {
    priority int
    source []string
  }
  priorityList := []priorityType{{ 1, []string{"ip", "session"} }, { 2, []string{ "userAgent", "session" } }, { 3, []string{ "session" } },  { 4, []string{ "ip", "userAgent"} }, { 5, []string{ "ip" } }, { 6, []string{ "userAgent" } }}
  for _, elem := range priorityList {
    if unorderedEqual(elem.source, new) {
      newPriority = elem.priority
    }
    if unorderedEqual(elem.source, current) {
      currentPriority = elem.priority
    }
  }
  return newPriority <= currentPriority
}

func unorderedEqual(first, second []string) bool {
  if len(first) != len(second) {
      return false
  }
  exists := make(map[string]bool)
  for _, value := range first {
      exists[value] = true
  }
  for _, value := range second {
      if !exists[value] {
          return false
      }
  }
  return true
}