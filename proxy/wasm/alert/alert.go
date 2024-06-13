package alert

import (
  "fmt"
	"math/rand"
	"reflect"
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

func SetAlertAction(alerts []AlertParam, config config_parser.ConfigType, headers map[string]string, blocklist, throttlelist []config_parser.BlocklistType) ([]map[string]string, []map[string]string) {
  var updateBlocklist []map[string]string
  var updateThrottleList []map[string]string
  session := alerts[0].LogParameters["session"]
  if config.Respond != nil && len(config.Respond) != 0 {
    for _, respondItem := range config.Respond {
      updateBlocklistItem := map[string]string{ "delay": "now" ,"duration": "forever" }
      sources, err := getSource(respondItem.Source, session, headers["user-agent"])
      if err != nil {
        respondJson, _ := json.Marshal(respondItem)
        proxywasm.LogErrorf("error while setAlertAction: %s: %s", err, respondJson)
        continue;
      }
      if len(sources) == 0 || len(strings.Split(respondItem.Source, ",")) != len(sources) {
        continue;
      }
      for _, source := range sources {
        updateBlocklistItem[source[0]] = source[1]
      }
      updateBlocklistItem["behavior"] = respondItem.Behavior
      if respondItem.Delay != "" {
        splitDelay := strings.Split(respondItem.Delay, "-")
        if len(splitDelay) == 2 {
          min, _ := strconv.Atoi(splitDelay[0][:len(splitDelay[0])-1])
          max, _ := strconv.Atoi(splitDelay[1][:len(splitDelay[1])-1])
          updateBlocklistItem["delay"] = strconv.Itoa(rand.Intn(max - min + 1) + min) + string(respondItem.Delay[len(respondItem.Delay)-1])
        } else {
          updateBlocklistItem["delay"] = respondItem.Delay
        }
      }
      if respondItem.Duration != "" {
        updateBlocklistItem["duration"] = respondItem.Duration
      }
      updateBlocklistItem["timeDetected"] = time.Now().Format("01-02-2006 15:04:05")

      if updateBlocklistItem["behavior"] == "throttle" {
        updateBlocklistItem["property"] = respondItem.Property
        if respondItem.Property == "" {
          updateBlocklistItem["property"] = "30-120"
        }
        if doesNotContains(throttlelist, updateBlocklistItem) {
          updateThrottleList = append(updateThrottleList, updateBlocklistItem)
          continue;
        }
      }
      if doesNotContains(blocklist, updateBlocklistItem) {
        updateBlocklist = append(updateBlocklist, updateBlocklistItem)
      }
    }
  }
  if alerts[0].Filter.Detect.Respond != nil && len(alerts[0].Filter.Detect.Respond) != 0 {
    for _, respondItem := range alerts[0].Filter.Detect.Respond {
      updateBlocklistItem := map[string]string{ "delay": "now" ,"duration": "forever" }
      sources, err := getSource(respondItem.Source, session, headers["user-agent"])
      if err != nil {
        respondJson, _ := json.Marshal(respondItem)
        proxywasm.LogErrorf("error while setAlertAction: %s: %s", err, string(respondJson))
        continue;
      }
      if len(sources) == 0 || len(strings.Split(respondItem.Source, ",")) != len(sources) {
        continue;
      }
      for _, source := range sources {
        updateBlocklistItem[source[0]] = source[1]
      }
      updateBlocklistItem["behavior"] = respondItem.Behavior
      if respondItem.Delay != "" {
        splitDelay := strings.Split(respondItem.Delay, "-")
        if len(splitDelay) == 2 {
          min, _ := strconv.Atoi(splitDelay[0][:len(splitDelay[0])-1])
          max, _ := strconv.Atoi(splitDelay[1][:len(splitDelay[1])-1])
          updateBlocklistItem["delay"] = strconv.Itoa(rand.Intn(max - min + 1) + min) + string(respondItem.Delay[len(respondItem.Delay)-1])
        } else {
          updateBlocklistItem["delay"] = respondItem.Delay
        }
      }
      if respondItem.Duration != "" {
        updateBlocklistItem["duration"] = respondItem.Duration
      }
      updateBlocklistItem["timeDetected"] = time.Now().Format("01-02-2006 15:04:05")
      if updateBlocklistItem["behavior"] == "throttle" {
        updateBlocklistItem["property"] = respondItem.Property
        if respondItem.Property == "" {
          updateBlocklistItem["property"] = "30-120"
        }
        if doesNotContains(throttlelist, updateBlocklistItem){
          updateThrottleList = append(updateThrottleList, updateBlocklistItem)
        }
        continue;
      }
      if doesNotContains(blocklist, updateBlocklistItem) {
        updateBlocklist = append(updateBlocklist, updateBlocklistItem)
      }
    }
  }
  return updateThrottleList, updateBlocklist
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
        userAgent = "empty"
      }
      sourceResponse = append(sourceResponse, [2]string{ "userAgent", userAgent })
    }
  }
    return sourceResponse, err
}

func toMapFiltered(s config_parser.BlocklistType) map[string]string {
	m := make(map[string]string)
  if s.Ip != "" {
	  m["ip"] = s.Ip
  }
  if s.Useragent != "" {
	  m["userAgent"] = s.Useragent
  }
	if s.Session != "" {
    m["session"] = s.Session
  }
  if s.Property != "" {
    m["property"] = s.Property
  }
  m["behavior"] = s.Behavior
  return m
}

func filterMapEle(m map[string]string, keys []string) map[string]string {
  mm := make(map[string]string)
  for key, value := range m {
    mm[key] = value
  }
	for _, key := range keys {
		delete(mm, key)
	}
	return mm
}

func doesNotContains(slice []config_parser.BlocklistType, element map[string]string) bool {
	for _, a := range slice {
		if reflect.DeepEqual(toMapFiltered(a), filterMapEle(element, []string{"delay", "duration", "timeDetected"})) {
			return false
		}
	}
	return true
}