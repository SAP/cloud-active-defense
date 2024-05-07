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
  updateBlacklist := map[string]string{ "delay": "now" ,"duration": "forever" }
  session := ""
  if config.Respond != config_parser.EmptyRespond() {
    sourceKey, sourceValue, err := getSource(config.Respond.Source, session, headers["user-agent"])
    if err != nil {
      proxywasm.LogErrorf("error while setAlertAction: %s", err)
    }
    updateBlacklist[sourceKey] = sourceValue
    updateBlacklist["behavior"] = config.Respond.Behavior
    if config.Respond.Delay != "" {
      updateBlacklist["delay"] = config.Respond.Delay
    }
    if config.Respond.Duration != "" {
      updateBlacklist["duration"] = config.Respond.Duration
    }
    updateBlacklist["timeDetected"] = time.Now().Format("01-02-2006 15:04:05")
  }
  for _, v := range alerts {
    session = v.LogParameters["session"]
    if v.Filter.Detect.Respond == config_parser.EmptyRespond() {
      break;
    }
    updateBlacklist = map[string]string{ "delay": "now" ,"duration": "forever" }  
    sourceKey, sourceValue, err := getSource(v.Filter.Detect.Respond.Source, v.LogParameters["session"], headers["user-agent"])
    if err != nil {
      proxywasm.LogErrorf("error while setAlertAction: %s", err)
      break;
    }
    updateBlacklist[sourceKey] = sourceValue
    updateBlacklist["behavior"] = v.Filter.Detect.Respond.Behavior
    if v.Filter.Detect.Respond.Delay != "" {
      updateBlacklist["delay"] = v.Filter.Detect.Respond.Delay
    }
    if v.Filter.Detect.Respond.Duration != "" {
      updateBlacklist["duration"] = v.Filter.Detect.Respond.Duration
    }
    updateBlacklist["timeDetected"] = time.Now().Format("01-02-2006 15:04:05")
  }
  return updateBlacklist
}

func getSource(configSource string, session string, userAgent string) (sourceKey, sourceValue string, err error) {
  sourceKey, sourceValue = "", ""
  switch configSource {
  case "ip":
    ip, err := proxywasm.GetProperty([]string{"source", "address"})
    if (err != nil) {
      err = fmt.Errorf("update blacklist: failed to fetch property: %v", err)
    }
    sourceKey, sourceValue = "ip", strings.Split(string(ip), ":")[0]
  case "session":
    if session == "" {
      err = fmt.Errorf("session is empty, please specify session config in config.json")
    }
    sourceKey, sourceValue = "session", session
  case "userAgent":
    sourceKey, sourceValue = "userAgent", userAgent
  }
  if sourceValue == "" {
    err = fmt.Errorf("source is empty")
  }
  return sourceKey, sourceValue, err
}