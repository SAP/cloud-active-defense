package main

import ( //"strconv"
	"sundew/config_parser"
	"sundew/detect"
	"sundew/inject"
	"sundew/shared"
  "sundew/config_proxy"

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm/types"
)

// plugin tick period, config is reread every tick
const tickMilliseconds uint32 = 1000

func main() {
  proxywasm.SetVMContext(&vmContext{})
}

type vmContext struct {
  types.DefaultVMContext
}

func (*vmContext) NewPluginContext(contextID uint32) types.PluginContext {
  return &pluginContext{contextID: contextID, config: &config_parser.Config{Session: config_parser.SessionConfig{} , Decoys: config_parser.DecoyConfig{ Filters: []config_parser.FilterType{}}}}
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
    configBody, err := proxywasm.GetHttpCallResponseBody(0, bodySize)
    if err != nil && err != types.ErrorStatusNotFound {
      proxywasm.LogWarnf("could not read body of config file: %v", err.Error())
    }
    oldConfig := ctx.config
    err, ctx.config = config_parser.ParseString(configBody)
    if err != nil {//&& err != types.ErrorStatusNotFound {
      proxywasm.LogErrorf("could not read config: %s\n continue with old config", err)
      ctx.config = oldConfig
      return
    }
    if (ctx.config == nil) {
      emptyConf := config_parser.EmptyConfig()
      ctx.config = &emptyConf
      return
    }
    if (ctx.config.Decoys.MakeChecksum() != oldConfig.Decoys.MakeChecksum()) {
      proxywasm.LogWarnf("read new config: ")//%v", *ctx.decoyConfig) 
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
}

func (ctx *pluginContext) NewHttpContext(contextID uint32) types.HttpContext {
  return &httpContext{contextID: contextID, config: ctx.config, cookies: make(map[string]string), headers: make(map[string]string), request:  &shared.HttpRequest{ nil, make(map[string]string), make(map[string]string)}}
}

type httpContext struct {
  types.DefaultHttpContext
  contextID             uint32
  config                *config_parser.Config
  totalResponseBodySize int
  cookies               map[string]string
  headers               map[string]string
  request *shared.HttpRequest
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

    err, ctx.request = inject.OnHttpRequestHeaders(ctx.request, ctx.config)
    if err != nil {
      proxywasm.LogErrorf("error while injecting request headers: %v", err.Error())
    }

    empty := ""               // onHttpRequestBody may not be called. set Body to "" to prevent nil panic
    ctx.request.Body = &empty

    err = detect.OnHttpRequestHeaders(ctx.request, ctx.config)
    if err != nil {
      proxywasm.LogCriticalf("failed to detect request headers: %s", err.Error())
      return types.ActionPause
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
  err = detect.OnHttpRequestBody(*ctx.request.Body, ctx.request.Headers, ctx.request.Cookies, ctx.config)
  if err != nil {
    proxywasm.LogErrorf("could not detect: %v", err.Error())
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
  
  err = detect.OnHttpResponseHeaders(ctx.request, ctx.headers, ctx.cookies, ctx.config)

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
  if err != nil {
    proxywasm.LogErrorf("failed to get response body: %v", err)
    return types.ActionContinue
  }
  //proxywasm.LogWarnf("this is the originial body: %v", originalBody) //debug

  err = detect.OnHttpResponseBody(string(originalBody), ctx.headers, ctx.cookies, ctx.config, ctx.request)

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
}
