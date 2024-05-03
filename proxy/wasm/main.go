package main

import ( //"strconv"
	"errors"
	"encoding/json"

	"sundew/block"
	"sundew/config_parser"
	"sundew/detect"
	"sundew/inject"
	"sundew/shared"
  "sundew/config_proxy"
	"sundew/alert"

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm/types"
)

// plugin tick period, config is reread every tick
const tickMilliseconds uint32 = 1000
var updateBlacklist map[string]string = map[string]string{}
var blacklist []config_parser.BlacklistType
var blocked bool = false

func main() {
  proxywasm.SetVMContext(&vmContext{})
}

type vmContext struct {
  types.DefaultVMContext
}

func (*vmContext) NewPluginContext(contextID uint32) types.PluginContext {
  return &pluginContext{contextID: contextID, config: &config_parser.Config{Config: config_parser.ConfigType{} , Decoys: config_parser.DecoyConfig{ Filters: []config_parser.FilterType{}}}}
}

type pluginContext struct {
  // Embed the default plugin context here,
  // so that we don't need to reimplement all the methods.
  types.DefaultPluginContext
  contextID             uint32
  config           *config_parser.Config
  configChecksum        [32]byte
  callBackConfRequested func(numHeaders, bodySize, numTrailers int)
}

func (ctx *pluginContext) OnPluginStart(pluginConfigurationSize int) types.OnPluginStartStatus {
  // load decoy config
  if err := proxywasm.SetTickPeriodMilliSeconds(tickMilliseconds); err != nil {
    proxywasm.LogCriticalf("failed to set tick period: %v", err.Error())
    return types.OnPluginStartStatusFailed
  }
  if config_proxy.Debug { proxywasm.LogWarnf("set tick period milliseconds: %d", tickMilliseconds) }

  ctx.callBackConfRequested = func(numHeaders, bodySize, numTrailers int) {
    emptyConf := config_parser.EmptyConfig()
    configBody, err := proxywasm.GetHttpCallResponseBody(0, bodySize)
    if err != nil && err != types.ErrorStatusNotFound {
      proxywasm.LogWarnf("could not read body of config file: %v", err.Error())
    }

    data, cas, _ := proxywasm.GetSharedData("oldConfig")
    err, oldConfig := config_parser.ParseString(data)
    if err != nil {
      oldConfig = &emptyConf
    }
    err = proxywasm.SetSharedData("oldConfig", configBody, cas)
    if err != nil && !errors.Is(err, types.ErrorStatusCasMismatch){
      proxywasm.LogErrorf("error setting old config: %s", err.Error())
    }
    err, ctx.config = config_parser.ParseString(configBody)
    if err != nil {//&& err != types.ErrorStatusNotFound {
      proxywasm.LogErrorf("could not read config: %s\n continue with old config", err)
      ctx.config = oldConfig
      return
    }
    if (ctx.config == nil) {
      ctx.config = &emptyConf
      return
    }
    if (ctx.config.Decoys.MakeChecksum() != oldConfig.Decoys.MakeChecksum()) {
      proxywasm.LogWarnf("read new config")//%v", *ctx.decoyConfig) 
    }
}
  return types.OnPluginStartStatusOK
}

func (ctx *pluginContext) OnTick() {
  //proxywasm.LogInfof("--- plugin tick, rereading config ---")
  requestHeaders := [][2]string{
    {":method", "GET"}, {":authority", "configmanager"}, {":path", "/CHANGE/ME"}, {"accept", "*/*"},
    {"Content-Type", "application/json"},
  }
  if _, err := proxywasm.DispatchHttpCall("configmanager", requestHeaders, nil, nil, 5000, ctx.callBackConfRequested); err != nil {
    proxywasm.LogCriticalf("dispatch httpcall failed: %v", err)
  }
  // Update blacklist via configmanager
  if len(updateBlacklist) != 0 {
    callBackSetBlacklist := func(numHeaders, bodySize, numTrailers int) {
      responseBody, err := proxywasm.GetHttpCallResponseBody(0, bodySize)
      if err != nil {
        proxywasm.LogErrorf("could not read body when setting blacklist: %v", err)
      }
      if string(responseBody) != "Done" {
        proxywasm.LogErrorf("error when setting blacklist: %v", string(responseBody))
      }
    }
    jsonUpdateBlacklist, err := json.Marshal(updateBlacklist)
    if err != nil {
      proxywasm.LogErrorf("could not convert updateBlacklist to json: %v", err)
      return
    }
    requestHeadersBlacklist := [][2]string{
      {":method", "POST"}, {":authority", "configmanager"}, {":path", "/blacklist"}, {"accept", "*/*"},
      {"Content-Type", "application/json"},
    }
    if _, err := proxywasm.DispatchHttpCall("configmanager", requestHeadersBlacklist, jsonUpdateBlacklist, nil, 5000, callBackSetBlacklist); err != nil {
      proxywasm.LogCriticalf("dispatch httpcall failed: %v", err)
    }
    updateBlacklist = map[string]string{}
  }
  callBackGetBlacklist:= func(numHeaders, bodySize, numTrailers int) {
    body, err := proxywasm.GetHttpCallResponseBody(0, bodySize)
    if err != nil {
      proxywasm.LogErrorf("%v", err.Error())
    }
    
    err, blacklist = config_parser.BlacklistJsonToStruct(body)
    if err != nil {
      proxywasm.LogErrorf("error when parsing blacklist:", err)
    }
  }
  reqHead := [][2]string{
      {":method", "GET"}, {":authority", "configmanager"}, {":path", "/blacklist"}, {"accept", "*/*"},
      {"Content-Type", "application/json"},
    }
  if _, err := proxywasm.DispatchHttpCall("configmanager", reqHead, nil, nil, 5000, callBackGetBlacklist); err != nil {
    proxywasm.LogCriticalf("dispatch httpcall failed: %v", err)
  }
}

func (ctx *pluginContext) NewHttpContext(contextID uint32) types.HttpContext {
  return &httpContext{contextID: contextID, config: ctx.config, cookies: make(map[string]string), headers: make(map[string]string), request:  &shared.HttpRequest{ nil, make(map[string]string), make(map[string]string)}, alerts: []alert.AlertParam{}}
}

type httpContext struct {
  types.DefaultHttpContext
  contextID             uint32
  config                *config_parser.Config
  totalResponseBodySize int
  cookies               map[string]string
  headers               map[string]string
  body                  string
  request               *shared.HttpRequest
  alerts                []alert.AlertParam
}

func (ctx *httpContext) OnHttpRequestHeaders(numHeaders int, endOfStream bool) types.Action {
  if numHeaders > 0 {
    removeContentLengthHeader("request")
    headers, err := proxywasm.GetHttpRequestHeaders()
    if err != nil {
      proxywasm.LogCriticalf("failed to get request headers: %s", err.Error())
      return types.ActionPause
    }

    err, ctx.request.Headers, ctx.request.Cookies = inject.ExtractRequestHeaders(headers)
    if err != nil {
      proxywasm.LogCriticalf("failed to extract request headers: %s", err.Error())
      return types.ActionPause
    }
    var action string
    blocked, action = block.IsBanned(blacklist, ctx.request.Headers, ctx.request.Cookies, ctx.config.Config.Alert)
    if action == "pause" {
      return types.ActionPause
    } else if action == "clone" {
      ctx.request.Headers[":authority"] = "clone"
    }

    err, ctx.request = inject.OnHttpRequestHeaders(ctx.request, ctx.config)
    if err != nil {
      proxywasm.LogErrorf("error while injecting request headers: %v", err.Error())
    }

    empty := ""               // onHttpRequestBody may not be called. set Body to "" to prevent nil panic
    ctx.request.Body = &empty
    err, alerts := detect.OnHttpRequestHeaders(ctx.request, ctx.config)
    if err != nil {
      proxywasm.LogCriticalf("failed to detect request headers: %s", err.Error())
      return types.ActionPause
    }
    if len(alerts) != 0 {
      ctx.alerts = append(ctx.alerts, alerts...)
    }

  } else {
    if config_proxy.Debug { proxywasm.LogWarn("no headers in request") } //debug
  }
  for header, value := range ctx.request.Headers {
 
    err := proxywasm.RemoveHttpRequestHeader(header)
    if err != nil {
      proxywasm.LogErrorf("could not remove request header (%s): %s", header, err.Error())
    }
 
    err = proxywasm.AddHttpRequestHeader(header, value)
    if err != nil {
      proxywasm.LogErrorf("could not add request header (%s= %s): %s", header, value, err.Error())
    }
  }
  err := proxywasm.RemoveHttpRequestHeader("Cookie")
  if err != nil {
    proxywasm.LogErrorf("could not remove request header (%s): %s", "Cookie", err.Error())
  }
  strCookie := ""
  for key, value := range ctx.request.Cookies {
    strCookie += key + "=" + value + ";"
    }
  err = proxywasm.AddHttpRequestHeader("Cookie", strCookie)
  if err != nil {
    proxywasm.LogErrorf("could not add request header (%s= %s): %s", "Cookie", strCookie, err.Error())
  }
  return types.ActionContinue
}

func (ctx *httpContext) OnHttpRequestBody(bodySize int, endOfStream bool) types.Action {
  ctx.totalResponseBodySize += bodySize
  if !endOfStream {
    if config_proxy.Debug { proxywasm.LogWarnf("waiting for body...") } //debug
    // wait for entire body
    return types.ActionPause
  }
  if config_proxy.Debug { proxywasm.LogWarnf("--- onhttprequestbody ---") } //debug

  requestBody, err := proxywasm.GetHttpRequestBody(0, ctx.totalResponseBodySize)
  if err != nil {
    proxywasm.LogErrorf("could not get httprequestbody: %v", err.Error())
    return types.ActionContinue
  }
  *ctx.request.Body = string(requestBody)

  err, injectedBody := inject.OnHttpRequestBody(ctx.request, []byte(*ctx.request.Body), ctx.config)
  if err != nil {
    proxywasm.LogErrorf("could not inject in reqBody: %v", err.Error())
  }
  *ctx.request.Body = string(injectedBody)

  err = proxywasm.ReplaceHttpRequestBody(injectedBody)
  if err != nil {
    proxywasm.LogErrorf("could not replace reqBody: %v", err.Error())
  }

  //proxywasm.LogWarnf("\nRequest body: \n%v", ctx.request.Body) //debug

  if config_proxy.Debug { proxywasm.LogWarnf("detecting in req body now") } //debug
  err, alerts := detect.OnHttpRequestBody(*ctx.request.Body, ctx.request.Headers, ctx.request.Cookies, ctx.config)
  if err != nil {
    proxywasm.LogErrorf("could not detect: %v", err.Error())
  }
  if len(alerts) != 0 {
    ctx.alerts = append(ctx.alerts, alerts...)
  }
  if config_proxy.Debug { proxywasm.LogWarn("detection in reqbody done") } //debug

  return types.ActionContinue
}

func removeContentLengthHeader(httpType string) {
  var err error
  if httpType == "request" {
    err = proxywasm.RemoveHttpRequestHeader("content-length");
  } else if httpType == "response" {
    err = proxywasm.RemoveHttpResponseHeader("content-length");
  }
  
  if err != nil {
    proxywasm.LogCritical(err.Error())
  }
}

func (ctx *httpContext) OnHttpResponseHeaders(numHeaders int, endOfStream bool) types.Action {
  removeContentLengthHeader("response")
  if config_proxy.Debug { proxywasm.LogWarn("calling OnHttpResponseHeaders") } // debug

  headers, err := proxywasm.GetHttpResponseHeaders()
  if err != nil {
    proxywasm.LogErrorf("could not get response headers: %v", err.Error())
  }

  /*
  proxywasm.LogWarnf("/nresponse headers:") //debug
  for _, header := range headers {
    proxywasm.LogWarnf("%v: %v", header[0], header[1])
    //err = proxywasm.AddHttpResponseHeader(key, header)
  }
  */

  err, ctx.headers, ctx.cookies = inject.ExtractResponseHeaders(headers)
  if err != nil {
    proxywasm.LogErrorf("could not extract response headers: %v", err.Error())
  }

  err, alerts := detect.OnHttpResponseHeaders(ctx.request, ctx.headers, ctx.cookies, ctx.config)
  if err != nil {
    proxywasm.LogCriticalf("failed to detect response headers: %s", err.Error())
    return types.ActionPause
  }

  if len(alerts) != 0 {
    ctx.alerts = append(ctx.alerts, alerts...)
  }
  err, injectHeaders := inject.OnHttpResponseHeaders(ctx.request, ctx.headers, ctx.cookies, ctx.config)
  if err != nil {
    proxywasm.LogErrorf("could not inject response headers: %v", err.Error())
  }

  // insert injected headers
  if config_proxy.Debug { proxywasm.LogWarnf("adding injected headers to response") }
  // err = proxywasm.ReplaceHttpResponseHeaders(injectHeaders)
  err = proxywasm.RemoveHttpResponseHeader("Set-Cookie")
  if err != nil {
    proxywasm.LogErrorf("could not remove response header (%s): %s", "Set-Cookie", err.Error())
  }
  
  for _, header := range injectHeaders {
    //proxywasm.LogWarnf("%v: %v", header[0], header[1])
    if header[0] != "Set-Cookie" {
      err = proxywasm.RemoveHttpResponseHeader(header[0])
      if err != nil {
        proxywasm.LogErrorf("could not remove response header (%s): %s", header[0], err.Error())
      }
    }

    err = proxywasm.AddHttpResponseHeader(header[0], header[1])
    if err != nil {
      proxywasm.LogErrorf("could not add response header (%s= %s): %s", header[0], header[1], err.Error())
    }
  }
  if config_proxy.Debug { proxywasm.LogWarn("response header injection done") } // debug
  return types.ActionContinue
}

func (ctx *httpContext) OnHttpResponseBody(bodySize int, endOfStream bool) types.Action {
  ctx.totalResponseBodySize += bodySize
  if !endOfStream {
    if config_proxy.Debug { proxywasm.LogWarnf("waiting for body...") } //debug
    // wait for entire body
    return types.ActionPause
  }

  originalBody, err := proxywasm.GetHttpResponseBody(0, ctx.totalResponseBodySize)
  ctx.body = string(originalBody)
  if err != nil {
    proxywasm.LogErrorf("failed to get response body: %v", err)
    return types.ActionContinue
  }
  //proxywasm.LogWarnf("this is the originial body: %v", originalBody) //debug

  err, alerts := detect.OnHttpResponseBody(string(originalBody), ctx.headers, ctx.cookies, ctx.config, ctx.request)
  if err != nil {
    proxywasm.LogCriticalf("failed to detect response body: %s", err.Error())
    return types.ActionPause
  }
  if len(alerts) != 0 {
    ctx.alerts = append(ctx.alerts, alerts...)
  }
  // proxywasm.LogWarnf("this is the original body: \n %s", originalBody)
  err, injectedResponse := inject.OnHttpResponseBody( ctx.request, originalBody, ctx.config)
  if err != nil {
    proxywasm.LogErrorf("failed to inject decoy: %v", err)
    return types.ActionContinue
  }

  err = proxywasm.ReplaceHttpResponseBody(injectedResponse) 
  if err != nil {
    proxywasm.LogErrorf("failed to inject response with decoy payload: %v", err)
    return types.ActionContinue
  }
  if config_proxy.Debug { proxywasm.LogWarn("succesfully injected sth") } //debug

  return types.ActionContinue
}

func (ctx *httpContext) OnHttpStreamDone() {
  if blocked {
    return
  }
  resBody := ctx.body
  reqBody := *ctx.request.Body
  session, username := detect.FindSession(map[string]map[string]string{"header": ctx.request.Headers, "cookie": ctx.request.Cookies, "payload": { "payload": reqBody }}, map[string]map[string]string{ "header": ctx.headers, "cookie": ctx.cookies, "payload": { "payload": resBody }}, ctx.config.Config.Alert)
  for i := 0; i < len(ctx.alerts); i++ {
    ctx.alerts[i].LogParameters["session"] = session
    ctx.alerts[i].LogParameters["username"] = username
    ctx.alerts[i].LogParameters["server"] = ctx.config.Config.Server
    alert.SendAlert(&ctx.alerts[i].Filter, ctx.alerts[i].LogParameters, ctx.request.Headers)
    updateBlacklist = alert.SetAlertAction(ctx.alerts, ctx.config.Config, ctx.request.Headers)
  }
}
