package detect

import (
	"fmt"
	"regexp"
	"strings"
	"sundew/config_parser"
	"sundew/alert"
	"sundew/shared"
  "sundew/config_proxy"

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
	//"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm/types"
)

type detectBody struct {
  conf         *config_parser.Config
  curFilter    *config_parser.FilterType
  body string
  headers map[string]string
  cookies map[string]string
  request *shared.HttpRequest
}

func (d *detectBody) Alert(logParameters map[string]string, headers map[string]string) error{
  err := alert.SendAlert(d.curFilter, logParameters, headers)
  if err != nil {
    return err
  }
  return nil
}

func OnHttpRequestBody(reqBody string, reqHeaders map[string]string, cookies map[string]string, config *config_parser.Config) (error, []alert.AlertParam) {
  d := &detectBody{ config, nil, reqBody, reqHeaders, cookies, nil }

  var err error

  if config_proxy.Debug { proxywasm.LogWarn("{\"type\": \"debug\", \"content\": \"*** detect request body ***\"}") } //debug
  alerts := []alert.AlertParam{}
  for ind := 0; ind < len(d.conf.Decoys.Filters); ind++ {
    d.curFilter = &d.conf.Decoys.Filters[ind]
    //proxywasm.LogWarnf("try filter[%v]: %v", ind, d.curFilter) //debug

  if isRelReq, err := d.relevantRequest(); err != nil {
      return fmt.Errorf("store.forRequest: can not compile regEx: %v", err.Error()), alerts
    } else if !d.relevantVerb() || !isRelReq {
      if config_proxy.Debug { proxywasm.LogWarnf("{\"type\": \"debug\", \"content\": \"skipped [%v] because wrong verb or request\"}", ind) } //debug
      continue
    }

    if d.curFilter.Detect.Seek.In != "payload" && d.curFilter.Detect.Seek.In != "postParam"{
      if config_proxy.Debug { proxywasm.LogWarnf("{\"type\": \"debug\", \"content\": \"skipped [%v] because not body\"}", ind) } //debug
      continue
    }
    if config_proxy.Debug { proxywasm.LogWarnf("{\"type\": \"debug\", \"content\": \"did not skip, apply filter[%v] now\"}", ind) } //debug

    err, decoyAlert := d.detectDecoyInRequest()
    if err != nil {
      return err, alerts
    }
    if decoyAlert != nil {
      alerts = append(alerts, *decoyAlert)
    }
  }
  return err, alerts
}

func OnHttpResponseBody(body string, headers map[string]string, cookies map[string]string, config *config_parser.Config, request *shared.HttpRequest) (error, []alert.AlertParam) {
  d := &detectBody{ config, nil, body, headers, cookies, request }

  var err error

  if config_proxy.Debug { proxywasm.LogWarn("{\"type\": \"debug\", \"content\": \"*** detect reponse body ***\"}") } //debug
  alerts := []alert.AlertParam{}
  for ind := 0; ind < len(d.conf.Decoys.Filters); ind++ {
    d.curFilter = &d.conf.Decoys.Filters[ind]
    //proxywasm.LogWarnf("try filter[%v]: %v", ind, d.curFilter) //debug

    err, skip := d.checkConditionsResponse(ind)
    if err != nil {
      return err, alerts
    } else if skip {
      continue
    } 
    if config_proxy.Debug { proxywasm.LogWarnf("{\"type\": \"debug\", \"content\": \"did not skip, apply filter[%v] now\"}", ind) } //debug

    err, decoyAlert := d.detectDecoyInResponse()
    if err != nil {
      return err, alerts
    }
    if decoyAlert != nil {
      alerts = append(alerts, *decoyAlert)
    }
  }
  return err, alerts
}

func (d *detectBody) checkConditionsResponse(ind int) (error, bool) {
  skip := true
  if isRelRes, err := d.relevantResponse(); err != nil {
      return fmt.Errorf("store.forResponse: can not compile regEx: %v", err.Error()), false
    } else if !d.relevantVerb() || !isRelRes {
      if config_proxy.Debug { proxywasm.LogWarnf("{\"type\": \"debug\", \"content\": \"skipped [%v] because wrong verb or response\"}", ind) } //debug
      return nil, skip 
    }

    if !(d.curFilter.Detect.Seek.In == "payload" || d.curFilter.Detect.Seek.In == "postParam") {
      if config_proxy.Debug { proxywasm.LogWarnf("{\"type\": \"debug\", \"content\": \"skipped [%v] because not body\"}", ind) } //debug
      return nil, skip
    }
  return nil, !skip
}

func (d *detectBody) detectDecoyInRequest() (error, *alert.AlertParam) {
  var err error = nil

  key := d.curFilter.Decoy.DynamicKey
  if key == "" {
    key = d.curFilter.Decoy.Key 
  }
  separator := d.curFilter.Decoy.Separator
  value := d.curFilter.Decoy.DynamicValue
  if value == "" {
    value = d.curFilter.Decoy.Value 
  }
  if d.curFilter.Detect.Seek.In == "postParam" {
    d.curFilter.Decoy.Separator = "="
  }

  err, keyMatches, combinedMatches := shared.KeyCombinedMatch(d.curFilter, &d.body)
  if err != nil {
    proxywasm.LogErrorf("{\"type\": \"system\", \"content\": \"could not match: %v\"}", err.Error())
  }

    alertInfos := make(map[string]string, 0)
    alertInfos["decoy"] = key+separator+value
    alertInfos["verb"] = d.headers[":method"]
    alertInfos["path"] = d.headers[":path"]
    if d.curFilter.Detect.Seek.In == "postParam" && keyMatches {
      rEValue, err := regexp.Compile(key + separator + "[^&]*")
      if err != nil {
        return fmt.Errorf("failed to retrieve postParam value of decoy:" , err.Error()), nil
      }
      matchesValue := rEValue.FindAllString(d.body, -1)
      injected := strings.Join(matchesValue, ", ")
      keyRm, err := regexp.Compile("^(&" + key + separator + "|" + key + separator + ")")
      if err != nil {
        return fmt.Errorf("failed to retrieve postParam value of decoy:" , err.Error()), nil
      }
      alertInfos["injected"] = keyRm.ReplaceAllString(injected, "")
    } else {
      err, injected := shared.FindInjectedValue(*d.curFilter, d.body)
      if err != nil {
        fmt.Errorf("%v", err)
      }
      alertInfos["injected"] = injected
    }

    sendAlert := false

  if d.curFilter.Detect.Alert.WhenSeen {
    if keyMatches { // key+separator -> seen
      alertInfos["alert"] += "KeySeen "
      sendAlert = true
    } 
  }
  if d.curFilter.Detect.Alert.WhenComplete {
    if combinedMatches {
      alertInfos["alert"] += "KeyValueComplete "
      sendAlert = true
    }
  }
  if d.curFilter.Detect.Alert.WhenModified {
    /*
    for _, matchKey := range matchesKey {
      isFullMatch := false
      for _, matchCombined := range matchesCombined {
        if matchKey[0] == matchCombined[0]{
          isFullMatch = true //key+separator+value found -> not modified
          break
        }
      }*/
      if keyMatches && !combinedMatches { // not sufficient, there might be multiple keyMatches
        alertInfos["alert"] += "ValueModified "
        sendAlert = true
      }
  }
  if d.curFilter.Detect.Alert.WhenAbsent {
    if !keyMatches { // key+separator not found -> absent
      alertInfos["alert"] += "KeyAbsent"
      sendAlert = true
    }
  }
  if sendAlert {
    return nil, &alert.AlertParam{ *d.curFilter, alertInfos }
  }
  return nil, nil
}

func (d *detectBody) detectDecoyInResponse() (error, *alert.AlertParam) {
  var err error = nil
  key := d.curFilter.Decoy.DynamicKey
  if key == "" {
    key = d.curFilter.Decoy.Key
  }
  value := d.curFilter.Decoy.DynamicValue
  if value == "" {
    value = d.curFilter.Decoy.Value 
  }
  separator := d.curFilter.Decoy.Separator
  if separator == "" {
    separator = "="
  }

  err, keyMatches, combinedMatches := shared.KeyCombinedMatch(d.curFilter, &d.body)
  if err != nil {
    proxywasm.LogErrorf("{\"type\": \"system\", \"content\": \"could not match: %v\"}", err.Error())
  }
  alertInfos := make(map[string]string, 0)
  alertInfos["decoy"] = key+separator+value
  alertInfos["verb"] = d.request.Headers[":method"]
  alertInfos["path"] = d.request.Headers[":path"]

  err, injected := shared.FindInjectedValue(*d.curFilter, d.body)
  if err != nil {
    proxywasm.LogErrorf("{\"type\": \"system\", \"content\": \"could not find injected value: %v\"}", err.Error())
  }
  alertInfos["injected"] = injected
  sendAlert := false

  if d.curFilter.Detect.Alert.WhenSeen {
    if keyMatches { // key+separator -> seen
      alertInfos["alert"] += "KeySeen "
      sendAlert=true
    } 
  }
  if d.curFilter.Detect.Alert.WhenComplete {
    if combinedMatches {
      alertInfos["alert"] += "KeyValueComplete "
      sendAlert=true
    }
  }
  if d.curFilter.Detect.Alert.WhenModified {
    /* for _, matchKey := range matchesKey {
      isFullMatch := false
      for _, matchCombined := range matchesCombined {
        if matchKey[0] == matchCombined[0] {
          isFullMatch = true //key+separator+value found -> not modified
          break
        }
      } */
      if keyMatches && !combinedMatches { // key+separator without value found -> modified
        alertInfos["alert"] += "ValueModified "
        sendAlert=true
      }
  }
  if d.curFilter.Detect.Alert.WhenAbsent {
    if keyMatches { // key+separator not found -> absent
      alertInfos["alert"] += "KeyAbsent "
      sendAlert=true
    }
  }

  if sendAlert {
    return nil, &alert.AlertParam{ *d.curFilter, alertInfos }
  }
  if config_proxy.Debug { proxywasm.LogWarn("{\"type\": \"debug\", \"content\": \"done\"}") }
  return nil, nil
}

func (d *detectBody) relevantVerb() bool {
  httpMethod := d.headers[":method"]
  if d.request != nil && d.request.Headers[":method"] != "" {
    httpMethod = d.request.Headers[":method"]
  }
  res := (d.curFilter.Detect.Seek.WithVerb == httpMethod) || (d.curFilter.Detect.Seek.WithVerb == "")
  if !res {
    if config_proxy.Debug { proxywasm.LogWarnf("{\"type\": \"debug\", \"content\": \"Method does not match: %s != %s \n\"}", d.curFilter.Detect.Seek.WithVerb, httpMethod) } //debug
  }
  return res
}

func (d *detectBody) relevantResponse() (bool, error) {
  if d.curFilter.Detect.Seek.InResponse == "" { return false, nil }
  regEx, err := regexp.Compile(d.curFilter.Detect.Seek.InResponse)
  if err != nil {
    return false, err
  }

  httpResUrl := d.request.Headers[":path"]
  result := regEx.MatchString(httpResUrl)
  if !result {
    //proxywasm.LogWarnf("Path does not match: %s != %s", httpResUrl, d.curFilter.Detect.Seek.InResponse) //debug
  }
  return result, nil
}

func (d *detectBody) relevantRequest() (bool, error) {
  if d.curFilter.Detect.Seek.InRequest == "" { return false, nil }
  regEx, err := regexp.Compile(d.curFilter.Detect.Seek.InRequest)
  if err != nil {
    return false, err
  }

  httpReqUrl := d.headers[":path"]
  res := regEx.MatchString(httpReqUrl)
  if !res {
    if config_proxy.Debug { proxywasm.LogWarnf("{\"type\": \"debug\", \"content\": \"Path does not match: %s != %s\"}", httpReqUrl, d.curFilter.Detect.Seek.InRequest) } //debug
  } else {
    if config_proxy.Debug { proxywasm.LogWarnf("{\"type\": \"debug\", \"content\": \"Path does match: %s != %s\"}", httpReqUrl, d.curFilter.Detect.Seek.InRequest) } //debug
  }
  return res, nil
}
