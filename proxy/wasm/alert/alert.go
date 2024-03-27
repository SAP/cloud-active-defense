package alert

import (
  //"fmt"
	//"strings"
  "sundew/config_parser"

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
	//"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm/types"
	"time"
  "encoding/json"
)

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
    Url:                    headers[":authority"],
    Server:                 string(server[:]),
    Useragent:              headers["user-agent"],
    SourceIP:               string(sourceIP[:]),
    Path:                   headers[":path"],
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
