package alert

import (
  "fmt"
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
  if config.Respond != config_parser.EmptyRespond() {
    sourceKey, sourceValue, err := getSource(config.Respond.Source, session, headers["user-agent"])
    if err != nil {
      proxywasm.LogErrorf("error while setAlertAction: %s", err)
      return map[string]string{}
    }
    if sourceKey == "" && sourceValue == "" {
      return map[string]string{}
    }
    updateBlocklist[sourceKey] = sourceValue
    updateBlocklist["behavior"] = config.Respond.Behavior
    if updateBlocklist["behavior"] == "throttle" {
      updateBlocklist["property"] = config.Respond.Property
      if config.Respond.Property == "" {
        updateBlocklist["property"] = "30-120"
      }
    }
    if config.Respond.Delay != "" {
      updateBlocklist["delay"] = config.Respond.Delay
    }
    if config.Respond.Duration != "" {
      updateBlocklist["duration"] = config.Respond.Duration
    }
    updateBlocklist["timeDetected"] = time.Now().Format("01-02-2006 15:04:05")
  }
  if len(alerts) == 0 {
    return map[string]string{}
  }

  if alerts[0].Filter.Detect.Respond == config_parser.EmptyRespond() {
    //if not set by global config return empty
    if updateBlocklist["behavior"] == "" {
      return map[string]string{}
    }
    return updateBlocklist
  }
  updateBlocklist = map[string]string{ "delay": "now" ,"duration": "forever" }  
  sourceKey, sourceValue, err := getSource(alerts[0].Filter.Detect.Respond.Source, alerts[0].LogParameters["session"], headers["user-agent"])
  if err != nil {
    proxywasm.LogErrorf("error while setAlertAction: %s", err)
    return map[string]string{}
  }
  if sourceKey == "" && sourceValue == "" {
    return map[string]string{}
  }
  updateBlocklist[sourceKey] = sourceValue
  updateBlocklist["behavior"] = alerts[0].Filter.Detect.Respond.Behavior
  if updateBlocklist["behavior"] == "throttle" {
    updateBlocklist["property"] = alerts[0].Filter.Detect.Respond.Property
    if alerts[0].Filter.Detect.Respond.Property == ""{
      updateBlocklist["property"] = "30-120"
    }
  }
  if alerts[0].Filter.Detect.Respond.Delay != "" {
    updateBlocklist["delay"] = alerts[0].Filter.Detect.Respond.Delay
  }
  if alerts[0].Filter.Detect.Respond.Duration != "" {
    updateBlocklist["duration"] = alerts[0].Filter.Detect.Respond.Duration
  }
  updateBlocklist["timeDetected"] = time.Now().Format("01-02-2006 15:04:05")
  return updateBlocklist
}

func getSource(configSource string, session string, userAgent string) (sourceKey, sourceValue string, err error) {
  sourceKey, sourceValue = "", ""
  switch configSource {
  case "ip":
    ip, err := proxywasm.GetProperty([]string{"source", "address"})
    if (err != nil) {
      err = fmt.Errorf("update blocklist: failed to fetch property: %v", err)
    }
    sourceKey, sourceValue = "ip", strings.Split(string(ip), ":")[0]
  case "session":
    if session != "" {
      sourceKey, sourceValue = "session", session
    }
  case "userAgent":
    sourceKey, sourceValue = "userAgent", userAgent
  }
  return sourceKey, sourceValue, err
}