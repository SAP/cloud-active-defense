package detect

import (
  "fmt"
  "regexp"
  "strings"

  //"strings"
  "sundew/alert"
  "sundew/config_parser"
  "sundew/shared"
  "sundew/config_proxy"

  "github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
  //"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm/types"
)

type detectHeader struct {
  conf         *config_parser.Config
  curFilter    *config_parser.FilterType
  headers map[string]string
  cookies map[string]string
  request *shared.HttpRequest
}

func (d *detectHeader) Alert(logParameters map[string]string, headers map[string]string) error{
  err := alert.SendAlert(d.curFilter, logParameters, headers)
  if err != nil {
    return err
  }
  return nil
}

func OnHttpRequestHeaders(request *shared.HttpRequest, config *config_parser.Config) (error, []alert.AlertParam) {
  d := &detectHeader{ config, nil, request.Headers, request.Cookies, nil}
  noFilters := len(d.conf.Decoys.Filters)
  if config_proxy.Debug { proxywasm.LogWarnf("*** detect request headers *** %v filters", noFilters) } //debug

  alerts := []alert.AlertParam{}
  for ind := 0; ind < noFilters; ind++ {
    d.curFilter = &d.conf.Decoys.Filters[ind]
    err, skip := d.checkConditionsRequest(ind)
    if err != nil {
      return err, alerts
    } else if skip {
      continue
    } 

    if config_proxy.Debug { proxywasm.LogWarnf("did not skip, apply filter[%v] now", ind) } //debug
    err, decoyAlert := d.detectDecoyInRequest()
    if err != nil {
      return err, alerts
    }
    if decoyAlert != nil {
      alerts = append(alerts, *decoyAlert)
    }
  }
  return nil, alerts
}

func OnHttpResponseHeaders(request *shared.HttpRequest, headers, cookies map[string]string, config *config_parser.Config) (error, []alert.AlertParam) {
  d := &detectHeader{ config, nil, headers, cookies, request}

  var err error

  if config_proxy.Debug { proxywasm.LogWarn("*** detect response headers ***") } //debug
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
    if config_proxy.Debug { proxywasm.LogWarnf("did not skip, apply filter[%v] now", ind) } //debug

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


func (d *detectHeader) checkConditionsRequest(ind int) (error, bool) {
  var skip bool = false

  if isRelReq, err := d.relevantRequest(); err != nil {
    return fmt.Errorf("store.forRequest: can not compile regEx: %v", err.Error()), true
  } else if !d.relevantVerbRequest() || !isRelReq {
    if config_proxy.Debug { proxywasm.LogWarnf("skip [%v] because wrong verb or request", ind) } //debug
    return nil, true
  }

  if d.curFilter.Detect.Seek.In == "payload" || d.curFilter.Detect.Seek.In == "postParam"{
    if config_proxy.Debug { proxywasm.LogWarnf("skipped [%v] because header detection", ind) } //debug
    return nil, true
  }
  return nil, skip
}

func (d *detectHeader) checkConditionsResponse(ind int) (error, bool) {
  var skip bool = false

  if isRelRes, err := d.relevantResponse(); err != nil {
    return fmt.Errorf("store.forResponse: can not compile regEx: %v", err.Error()), true
  } else if !d.relevantVerbResponse() || !isRelRes {
    if config_proxy.Debug { proxywasm.LogWarnf("skip [%v] because wrong verb or response", ind) } //debug
    return nil, true
  }

  if d.curFilter.Detect.Seek.In == "payload" || d.curFilter.Detect.Seek.In == "postParam"{
    if config_proxy.Debug { proxywasm.LogWarnf("skipped [%v] because header detection", ind) } //debug
    return nil, true
  }
  return nil, skip
}

func (d *detectHeader) detectDecoyInRequest() (error, *alert.AlertParam) {
  var err error
  key := d.curFilter.Decoy.DynamicKey
  if key == "" {
    key = d.curFilter.Decoy.Key 
  }
  separator := d.curFilter.Decoy.Separator
  value := d.curFilter.Decoy.DynamicValue
  if value == "" {
    value = d.curFilter.Decoy.Value 
  }

  alertInfos := make(map[string]string, 0)
  alertInfos["decoy"] = key+separator+value
  alertInfos["verb"] = d.headers[":method"]
  alertInfos["path"] = d.headers[":path"]

  sendAlert := false

  switch d.curFilter.Detect.Seek.In {
  case "cookie":
    err, sendAlert = d.detectCookie(&alertInfos)
    break;
  case "header":
    err , sendAlert = d.detectHeader(&alertInfos)
    break;
  case "url":
    err , sendAlert = d.detectUrl(&alertInfos)
    break;
  case "getParam":
    err, sendAlert  = d.detectGetParam(&alertInfos)
    break;
  case "":
    return nil, nil
  default:
    err = fmt.Errorf("detect.seek.in is invalid: %v")
    break;
}

  if err != nil {
    return err, nil
  }
  if sendAlert {
    return nil, &alert.AlertParam{ *d.curFilter, alertInfos }
  }
  return nil, nil
}

func (d *detectHeader) detectDecoyInResponse() (error, *alert.AlertParam) {
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

  alertInfos := make(map[string]string, 0)
  alertInfos["decoy"] = key+separator+value
  alertInfos["verb"] = d.request.Headers[":method"]
  alertInfos["path"] = d.request.Headers[":path"]

  sendAlert := false

  switch d.curFilter.Detect.Seek.In {
  case "cookie":
    err, sendAlert = d.detectCookie(&alertInfos)
    break;
  case "header":
    err , sendAlert = d.detectHeader(&alertInfos)
    break;
  case "url":
    err , sendAlert = d.detectUrl(&alertInfos)
    break;
  case "getParam":
    err, sendAlert  = d.detectGetParam(&alertInfos)
    break;
  case "":
    return nil, nil
  default:
    err = fmt.Errorf("detect.seek.in is invalid: %v")
}
  if err != nil {
    return err, nil
  }

  if sendAlert {
    return nil, &alert.AlertParam{ *d.curFilter, alertInfos }
  }
  return nil, nil
}

func (d *detectHeader) relevantVerbRequest() bool {
  httpMethod := d.headers[":method"]
  res := (d.curFilter.Detect.Seek.WithVerb == httpMethod) || (d.curFilter.Detect.Seek.WithVerb == "")
  if !res {
    if config_proxy.Debug { proxywasm.LogWarnf("Method does not match: %s != %s \n", d.curFilter.Detect.Seek.WithVerb, httpMethod) } //debug
  }
  return res
}

func (d *detectHeader) relevantVerbResponse() bool {
  httpMethod := d.request.Headers[":method"]
  res := (d.curFilter.Detect.Seek.WithVerb == httpMethod) || (d.curFilter.Detect.Seek.WithVerb == "")
  if !res {
    if config_proxy.Debug { proxywasm.LogWarnf("Method does not match: %s != %s \n", d.curFilter.Detect.Seek.WithVerb, httpMethod) } //debug
  }
  return res
}

func (d *detectHeader) relevantRequest() (bool, error) {
  if d.curFilter.Detect.Seek.InRequest == "" {
    return false, nil
  }
  regEx, err := regexp.Compile(d.curFilter.Detect.Seek.InRequest)
  if err != nil {
    return false, err
  }

  httpReqUrl := d.headers[":path"]
  res := regEx.MatchString(httpReqUrl)
  if !res {
    if config_proxy.Debug { proxywasm.LogWarnf("Path does not match: %s != %s", httpReqUrl, d.curFilter.Detect.Seek.InRequest) } //debug
  }
  return res, nil
}

func (d *detectHeader) relevantResponse() (bool, error) {
  if d.curFilter.Detect.Seek.InResponse == "" {
    return false, nil
  }
  regEx, err := regexp.Compile(d.curFilter.Detect.Seek.InResponse)
  if err != nil {
    return false, err
  }

  httpResUrl := d.request.Headers[":path"]
  res := regEx.MatchString(httpResUrl)
  if !res {
    if config_proxy.Debug { proxywasm.LogWarnf("Path does not match: %s != %s", httpResUrl, d.curFilter.Detect.Seek.InResponse) } //debug
  }else{
    if config_proxy.Debug { proxywasm.LogWarnf("Path does match: %s != %s", httpResUrl, d.curFilter.Detect.Seek.InResponse) } //debug
  }
  return res, nil
}

func (d *detectHeader) detectCookie(alertInfos *map[string]string) (error, bool) {
  var err error
  sendAlert := false
  var cookie string
  var exists bool
  key := d.curFilter.Decoy.Key
  if cookie, exists = d.cookies[key]; !exists {
    return nil, false
  } 
  cookie = key+"="+cookie // for matching combined / modified
  (*alertInfos)["injected"] = d.cookies[key]
  err, keyMatch, combinedMatch := shared.KeyCombinedMatch(d.curFilter, &cookie)
  if err != nil {
    return fmt.Errorf("could not match: %v", err.Error()), false
  }

  if d.curFilter.Detect.Alert.WhenSeen {
    if keyMatch {
      (*alertInfos)["alert"] += "KeySeen " 
      sendAlert=true
    } 
  }
  if d.curFilter.Detect.Alert.WhenComplete {
    if combinedMatch {
      sendAlert = true
      (*alertInfos)["alert"] += "KeyValueComplete "
    }
  }
  if d.curFilter.Detect.Alert.WhenModified {
    if keyMatch && !combinedMatch {
      sendAlert = true
      (*alertInfos)["alert"] += "KeyValueModified "
    }
  }
  if d.curFilter.Detect.Alert.WhenAbsent {
    if !keyMatch {
      (*alertInfos)["alert"] += "KeyAbsent "
      sendAlert=true
    }
  }
  return nil, sendAlert
}

func (d *detectHeader) detectHeader(alertInfos *map[string]string) (error, bool) {
  var err error
  sendAlert := false
  var header string
  var exists bool
  key := d.curFilter.Decoy.Key
  if header, exists = d.headers[key]; !exists {
    return nil, false
  } 
  header = key+"="+header
  (*alertInfos)["injected"] = d.headers[key]
  err, keyMatch, combinedMatch := shared.KeyCombinedMatch(d.curFilter, &header)
  if config_proxy.Debug { proxywasm.LogWarnf("detect in header matches key %v, combined %v", keyMatch, combinedMatch ) } //debug
  if err != nil {
    return fmt.Errorf("could not match: %v", err.Error()), false
  }

  if d.curFilter.Detect.Alert.WhenSeen {
    if keyMatch {
      (*alertInfos)["alert"] += "KeySeen "
      sendAlert=true
    } 
  }
  if d.curFilter.Detect.Alert.WhenComplete {
    if combinedMatch {
      sendAlert = true
      (*alertInfos)["alert"] += "KeyValueComplete "
    }
  }
  if d.curFilter.Detect.Alert.WhenModified {
    if keyMatch && !combinedMatch {
      sendAlert = true
      (*alertInfos)["alert"] += "KeyValueModified "
    }
  }
  if d.curFilter.Detect.Alert.WhenAbsent {
    if !keyMatch {
      (*alertInfos)["alert"] += "KeyAbsent "
      sendAlert=true
    }
  }
  return nil, sendAlert
}

func (d *detectHeader) detectUrl(alertInfos *map[string]string) (error, bool) {
  var err error
  sendAlert := false

  fullPath, exists := d.headers[":path"] 
  if !exists {
    fullPath = ""
  } else if queryStart := strings.IndexByte(fullPath, '?'); queryStart >= 0 {
    fullPath = fullPath[:queryStart]  // cut query params of
  }
  err, keyMatch, combinedMatch := shared.KeyCombinedMatch(d.curFilter, &fullPath)
  if keyMatch {
    key := ""
    if d.curFilter.Decoy.DynamicKey != "" {
      key = d.curFilter.Decoy.DynamicKey
    } else {
      key = d.curFilter.Decoy.Key
    }
    rEKey, err := regexp.Compile(key)
    if err != nil {
      fmt.Errorf( "invalid regex %v: %v", key, err.Error())
    }
    injectedValue := rEKey.FindStringSubmatch(fullPath)
    if len(injectedValue) > 1 {
      (*alertInfos)["injected"] = injectedValue[1]
		} else if len(injectedValue) == 0 {
			(*alertInfos)["injected"] = fullPath
		} else {
			(*alertInfos)["injected"] = injectedValue[0]
		}
  }
  if err != nil {
    return fmt.Errorf("could not match: %v", err.Error()), false
  }

  //proxywasm.LogWarnf("detecting url: path: %v against key: %v ",d.headers[":path"], d.curFilter.Decoy.Key) //debug
  //proxywasm.LogWarnf("url detect with %v now", key+separator+value) //debug

  if d.curFilter.Detect.Alert.WhenSeen {
    if keyMatch {
      sendAlert = true
      (*alertInfos)["alert"] = "KeySeen "
    }
  }
  if d.curFilter.Detect.Alert.WhenComplete {
    if combinedMatch {
      sendAlert = true
      (*alertInfos)["alert"] += "KeyValueComplete "
    }
  }
  if d.curFilter.Detect.Alert.WhenModified {
    if keyMatch && !combinedMatch {
      sendAlert = true
      (*alertInfos)["alert"] += "ValueModified "
    }
  }
  if d.curFilter.Detect.Alert.WhenAbsent {
    if !keyMatch {
      (*alertInfos)["alert"] += "KeySeen "
    }
  }
  return nil, sendAlert
}

func (d *detectHeader) detectGetParam(alertInfos *map[string]string) (error, bool) {
  var err error
  sendAlert := false

  query, exists := d.headers[":path"] 
  if !exists {
    query = ""
  } else if queryStart := strings.IndexByte(query, '?'); queryStart >= 0 {
    query = query[queryStart:]  // cut path of
  }

  // if key / value are regex, use them & find matches else use stringmatches
  var keyMatch, combinedMatch bool 
  key := d.curFilter.Decoy.DynamicKey 
  if key == "" {
    key = d.curFilter.Decoy.Key
    keyMatch, err = shared.StringMatches(&key, &query)
    if err != nil {
      return fmt.Errorf("invalid strings: %v", err.Error()), false
    }
  } else {
    keyMatch, err = shared.RegexMatches(&key, &query)
    if err != nil {
      return fmt.Errorf("invalid regex: %v", err.Error()), false
    }
  }
  value := d.curFilter.Decoy.DynamicValue 
  if value == "" {
    value = key+"="+d.curFilter.Decoy.Value
    combinedMatch, err = shared.StringMatches(&value, &query)
    if err != nil {
      return fmt.Errorf("invalid strings: %v", err.Error()), false
    }
  } else {
    value = key+"="+value
    combinedMatch, err = shared.RegexMatches(&value, &query)
    if err != nil {
      return fmt.Errorf("invalid regex: %v", err.Error()), false
    }
  }

  rEValue, err := regexp.Compile(`(\?|&)` + key + `[^&]*`)
  if err != nil {
    return fmt.Errorf("failed to retrieve getParam value of decoy: " , err.Error()), false
  }
  matchesValue := rEValue.FindAllString(query, -1)
  injected := strings.Join(matchesValue, ", ")
  keyRm, err := regexp.Compile(`(&|\?)` + key + "=")
  if err != nil {
    return fmt.Errorf("failed to retrieve getParam value of decoy: " , err.Error()), false
  }
  (*alertInfos)["injected"] = keyRm.ReplaceAllString(injected, "")

  if d.curFilter.Detect.Alert.WhenSeen && key != "" {
    if keyMatch { 
      (*alertInfos)["alert"] = "KeySeen "
      sendAlert=true
    } 
  }
  if d.curFilter.Detect.Alert.WhenComplete && key != "" && value != "" {
    if combinedMatch {  
      (*alertInfos)["alert"] = "KeyValueComplete "
      sendAlert=true
    }
  }
  if d.curFilter.Detect.Alert.WhenModified && key != "" {
    if keyMatch && !combinedMatch {  
      (*alertInfos)["alert"] = "ValueModified "
      sendAlert=true
    }
  }
  if d.curFilter.Detect.Alert.WhenAbsent {
    if !keyMatch {  
      (*alertInfos)["alert"] = "KeyAbsent "
      sendAlert=true
    }
  }
  return nil, sendAlert
}