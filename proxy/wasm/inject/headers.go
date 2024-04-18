package inject

import (
	"slices"
	"sundew/config_parser"
	"sundew/shared"
	"sundew/config_proxy"

	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
)

func ExtractResponseHeaders(headers [][2]string) (err error, headerMap, cookieMap map[string]string) {
	// called in proxywasm.OnHttpRequestHeaders
	// returns headers and cookies in [key]value map
	err = nil
	headerMap = map[string]string{}
	cookieMap = map[string]string{}
	//proxywasm.LogWarn("onhttpreq resp headers: ") //debug
	for _, header := range headers {
		if header[0] == "set-cookie" {
			cookieKey, cookieValue := getSetCookies(header[1])
			cookieMap[cookieKey] = cookieValue
		} else{
			headerMap[normalizeKey(header[0])] = header[1]
		}
		//proxywasm.LogWarnf("#%d %s: %s", ind, header[0], header[1]) //debug
	}
	return err, headerMap, cookieMap
}
func ExtractRequestHeaders(headers [][2]string) (err error, headerMap, cookieMap map[string]string) {
	// called in proxywasm.OnHttpRequestHeaders
	// returns headers and cookies in [key]value map
	err = nil
	headerMap = map[string]string{}
	cookieMap = map[string]string{}
	//proxywasm.LogWarn("onhttpreq resp headers: ") //debug
	for _, header := range headers {
		headerMap[normalizeKey(header[0])] = header[1]
		if header[0] == "cookie" {
			cookieMap = getCookies(header[1])
		}
		//proxywasm.LogWarnf("#%d %s: %s", ind, header[0], header[1]) //debug
	}
	return err, headerMap, cookieMap
}

func OnHttpResponseHeaders(request *shared.HttpRequest, headers, cookies map[string]string, conf *config_parser.Config) (error, [][2]string) {
	// called in proxywasm.OnHttpResponseHeaders
	// injects decoys
	i := injectHeader{
		conf:            conf,
		curFilter:       nil,
		curKey:          nil,
		headers:         headers,
		cookies:         cookies,
    request:         request,
		injectString:    "",
		headerContent:   "",
		injectedHeaders: nil,
	}
	// insert cookies, headers
	if config_proxy.Debug { proxywasm.LogWarn("*** inject response headers ***") } //debug
	for filterInd := 0; filterInd < len(conf.Decoys.Filters); filterInd++ {
		i.curFilter = &conf.Decoys.Filters[filterInd]
    //proxywasm.LogWarnf("try filter[%v]", filterInd) //debug
		if i.curFilter.Inject.Store.As != "body" {

      //check whenTrue/False Conditions
      if err, conditionsApply := i.checkConditionsResponse(filterInd); err != nil {
        return err, nil
      } else if conditionsApply == false {
        continue
      }

	  if config_proxy.Debug { proxywasm.LogWarnf("did not skip, apply filter [%v] now", filterInd) } //debug

			err := i.setInitialHeaderContent()
			if err != nil {
				return err, nil
			}
			err = i.injectDecoyInResponse()
			if err != nil {
				return err, nil
			}
		}else{
			if config_proxy.Debug { proxywasm.LogWarnf("skipped because body") } //debug
    }
	}

	// sort headers alphabetically by value
	i.mapToSortedHeaderArray()
	// add Set-Cookie headers
	i.storeCookies()

	return nil, i.injectedHeaders
}

func OnHttpRequestHeaders(request *shared.HttpRequest, conf *config_parser.Config) (error, *shared.HttpRequest) {
	// called in proxywasm.OnHttpResponseHeaders
	// injects decoys
	i := injectHeader{
		conf:            conf,
		curFilter:       nil,
    curKey:          nil,
		headers:         request.Headers,
		cookies:         request.Cookies,
    request:         nil,
		injectString:    "",
		headerContent:   "",
		injectedHeaders: nil,
	}
	// insert cookies, headers
	if config_proxy.Debug { proxywasm.LogWarn("*** inject request headers ***") } //debug
	for filterInd := 0; filterInd < len(conf.Decoys.Filters); filterInd++ {
		i.curFilter = &conf.Decoys.Filters[filterInd]
    //proxywasm.LogWarnf("try filter[%v]", filterInd) //debug
      //check whenTrue/False Conditions
      if err, conditionsApply := i.checkConditionsRequest(filterInd); err != nil {
        return err, request
      } else if conditionsApply == false {
        continue
      }

	  if config_proxy.Debug { proxywasm.LogWarnf("did not skip, apply filter [%v] now", filterInd) } //debug

    err := i.injectDecoyInRequest()
			if err != nil {
				return err, request
			}
		}
	
  i.storeInjectedHeadersInRequest()
	return nil, i.request
}

type injectHeader struct {
	conf      *config_parser.Config
	curFilter *config_parser.FilterType
  curKey    *string

	headers         map[string]string
	cookies         map[string]string
  request         *shared.HttpRequest
	injectString    string
	headerContent   string
	injectedHeaders [][2]string
}

func getCookies(cookieStr string) map[string]string {
	// extracts cookies from cookie header
	// returns map[key]value of cookies
	// proxywasm.LogWarnf("cookiestr looks like this: %s", cookieStr) //debug
	cookies := map[string]string{}
	if cookieStr != "" {
		cookieSplits := strings.Split(cookieStr, ";")
		for _, cookieSubStr := range cookieSplits {
      cookieSubStr = strings.TrimSpace(cookieSubStr)
			cookie := strings.Split(cookieSubStr, "=")
      //cookie[0] = strings.TrimSpace(cookie[0])

			cookies[cookie[0]] = cookie[1]
		}
	}
	return cookies
}

func getSetCookies(cookieStr string) (key, value string) {
	before, after, _ := strings.Cut(cookieStr, "=")
	return before, after
}

func (i *injectHeader) checkConditionsResponse(ind int) (error, bool) {

  if isRelReq, err := i.isRelevantPathResponse(); err != nil {
    return fmt.Errorf("store.forRequest: can not compile regEx: %v", err.Error()), false
  } else if !i.isRelevantVerb() || !isRelReq {
    if config_proxy.Debug { proxywasm.LogWarnf("skipped[%v] because wrong verb or request", ind) } //debug
    return nil, false
  }

  if i.curFilter.Inject.Store.As != "header" && i.curFilter.Inject.Store.As != "cookie" && i.curFilter.Inject.Store.As != "status" {
    if config_proxy.Debug { proxywasm.LogWarnf("skipped[%v] because not body: ", ind) } //debug
    return nil, false
  }

  if i.curFilter.Inject.Store == config_parser.EmptyStore() {
    return nil, false
  }

  for _, condition := range i.curFilter.Inject.WhenTrue {
    err, applies := WhenTrue(i.request, &condition) 
    if err != nil {
      return err, false
    }
    if !applies {
		if config_proxy.Debug { proxywasm.LogWarnf("skipped[%v] because %v=%v could not be found in %v", ind, condition.Key, condition.Value, condition.In) } //debug
      return nil, false
    }
  }
  for _, condition := range i.curFilter.Inject.WhenFalse {
    err, applies := WhenFalse(i.request, &condition) 
    if err != nil {
      return err, false
    }
    if !applies {
		if config_proxy.Debug { proxywasm.LogWarnf("skipped[%v] because %v=%v was found in %v", ind, condition.Key, condition.Value, condition.In) } //debug
      return nil, false
    }
  }
  if config_proxy.Debug { proxywasm.LogWarnf("5") } //debug
  return nil, true
}

func (i *injectHeader) checkConditionsRequest(ind int) (error, bool) {

  if isRelReq, err := i.isRelevantPathRequest(); err != nil {
    return fmt.Errorf("store.inRequest: can not compile regEx: %v", err.Error()), false
  } else if !i.isRelevantVerb() || !isRelReq {
    if config_proxy.Debug { proxywasm.LogWarnf("skipped[%v] because wrong verb or request", ind) } //debug
    return nil, false
  }

  if i.curFilter.Inject.Store.As != "header" && i.curFilter.Inject.Store.As != "cookie" {
    if config_proxy.Debug { proxywasm.LogWarnf("skipped[%v] because not body: ", ind) } //debug
    return nil, false
  }

  if i.curFilter.Inject.Store == config_parser.EmptyStore() {
    return nil, false
  }

  request := &shared.HttpRequest{nil, i.headers, i.cookies}

  for _, condition := range i.curFilter.Inject.WhenTrue {
    err, applies := WhenTrue(request, &condition) 
    if err != nil {
      return err, false
    }
    if !applies {
		if config_proxy.Debug { proxywasm.LogWarnf("skipped[%v] because %v=%v could not be found in %v", ind, condition.Key, condition.Value, condition.In) } //debug
      return nil, false
    }
  }
  for _, condition := range i.curFilter.Inject.WhenFalse {
    if config_proxy.Debug { proxywasm.LogWarnf("checking %v, %v", request.Cookies["state"], condition.Key) }
    err, applies := WhenFalse(request, &condition) 
    if err != nil {
      return err, false
    }
    if !applies {
		if config_proxy.Debug { proxywasm.LogWarnf("skipped[%v] because %v=%v was found in %v", ind, condition.Key, condition.Value, condition.In) } //debug
      return nil, false
    }
  }
  return nil, true
}

func (i *injectHeader) injectDecoyInResponse() error {
	var err error = nil

	err = i.setInjectString()
	if err != nil {
		return fmt.Errorf("error while injecting decoy with method %s: %s", i.curFilter.Inject.Store.At.Method, err.Error())
	}
	err = i.setInitialHeaderContent()
	if err != nil {
		return fmt.Errorf("error while injecting decoy with method %s: %s", i.curFilter.Inject.Store.At.Method, err.Error())
	}
  err = i.callInjectionMethod()
  if err != nil {
    return fmt.Errorf("error while injecting decoy with method %s: %s", i.curFilter.Inject.Store.At.Method, err.Error())
  }

	err = i.storeInjectedHeader()
	if err != nil {
		return fmt.Errorf("could not add injected header: %s", err.Error())
	}

	if err != nil {
		return err
	}
	if config_proxy.Debug { proxywasm.LogWarnf("successfully injected sth in headers") } //debug
	return nil
}

func (i *injectHeader) injectDecoyInRequest() error {
	var err error = nil

	err = i.setInjectString()
  if err != nil {
    return err
  }

  err = i.setInitialHeaderContent()
  if err != nil {
    return err
  }

  err = i.callInjectionMethod()
  if err != nil {
    return fmt.Errorf("error while injecting decoy with method %s: %s", i.curFilter.Inject.Store.At.Method, err.Error())
  }

	err = i.storeInjectedHeader()
	if err != nil {
		return fmt.Errorf("could not add injected header: %s", err.Error())
	}

	if config_proxy.Debug { proxywasm.LogWarnf("successfully injected sth") }//debug
	return nil
}

func (i * injectHeader) callInjectionMethod() error {
  var err error = nil

	switch i.curFilter.Inject.Store.At.Method {
	case "character":
		err = i.storeMethodCharacter()
		break
	case "line":
		err = i.storeMethodLine()
		break
	case "before":
		err = i.storeMethodBefore()
		break
	case "after":
		err = i.storeMethodAfter()
		break
	case "replace":
		err = i.storeMethodReplace()
		break
	case "always":
		err = i.storeMethodAlways()
		break
	case "":
		i.curFilter.Inject.Store.At.Property = "-0"
		err = i.storeMethodCharacter()
		break
	default:
		err = fmt.Errorf("can not inject decoy: invalid method \"%s\" at inject.store.at.method", i.curFilter.Inject.Store.At.Method)
		break
	}

  return err
}

func (i *injectHeader) storeInjectedHeader() error {
  if *i.curKey == "" {
    return fmt.Errorf("curKey can not be empty in storeInjectedHeader")
  }
	if i.curFilter.Inject.Store.As == "header" {
		i.headers[*i.curKey] = i.headerContent
	} else if i.curFilter.Inject.Store.As == "cookie" {
		i.cookies[*i.curKey] = i.headerContent
	} else if i.curFilter.Inject.Store.As == "status" {
		i.headers[":status"] = i.headerContent
	} else {
		// should never happen
		return fmt.Errorf("fatal: can not apply body filter to headers")
	}
	return nil
}

func (i *injectHeader) storeCookies() {
	cookies := i.cookies
	cookieArray := make([][2]string, 0, len(cookies))
	for key, value := range cookies {
		cookieArray = append(cookieArray, [2]string{"Set-Cookie", key + "=" + value})
	}
	i.injectedHeaders = append(i.injectedHeaders, cookieArray...)
}

func (i *injectHeader) setInitialHeaderContent() error {
	// sets i.headerContent
	// checks if header exists / create new one if not
	// checks if header was already modified by filters, applies filter on top if yes
	key := i.curFilter.Decoy.Key
	dynamicKey := i.curFilter.Decoy.DynamicKey
  var err error

  if dynamicKey != "" { // if dynamicKey exists: generate key, if not: use key
    i.curKey, err = shared.RegexGen(&dynamicKey)
    if err != nil {
      return fmt.Errorf("could not set initial header content: %v", err.Error())
    }
  } else {
    i.curKey = &key
  }

	if i.curFilter.Inject.Store.As == "header" {
		var headerExists bool
		i.headerContent, headerExists = i.headers[*i.curKey]
    if !headerExists { // if header exists: leave it, if not: insert new one
			i.headerContent = ""
			i.headers[*i.curKey] = ""
			i.curFilter.Inject.Store.At.Method = ""
		} else {
			i.headers[*i.curKey] = i.headerContent
		}

	} else if i.curFilter.Inject.Store.As == "cookie" {
		var cookieExists bool
		i.headerContent, cookieExists = i.cookies[*i.curKey]
		if !cookieExists { // if cookie exists: leave it, if not: insert new one
			// cookie does not exist in http request, inserting new one
			i.headerContent = ""
			i.cookies[*i.curKey] = "" // changed from i.headers to i.cookies was that correct?
		} else {
			// cookie exists and will now be modified
			i.cookies[key] = i.headerContent
		}
	} else if i.curFilter.Inject.Store.As == "status" {
		i.headers[":status"] = ""
		i.curFilter.Inject.Store.At.Method = ""
	} else {
		return fmt.Errorf("set initial header content: can not apply body filter to headers")
	}
  return nil
}

func (i *injectHeader) setInjectString() error {
	// sets i.injectString from curFilter config
	i.injectString = ""
  dynVal := &i.curFilter.Decoy.DynamicValue
  str := &i.curFilter.Decoy.String
  var err error

  if *str != ""{ // if string exists: use it, else if dynamicValue exists, generate from it, else use value
		i.injectString = *str
  } else if  *dynVal != "" { 
    dynVal, err = shared.RegexGen(dynVal)
    if err != nil {
      return fmt.Errorf("could not set inject string: %v", err.Error())
    }
    i.injectString = *dynVal
  } else if i.curFilter.Inject.Store.As == "status" {
	
	if i.curFilter.Decoy.DynamicKey != "" {
		i.injectString = i.curFilter.Decoy.DynamicKey
	} else {
		i.injectString = i.curFilter.Decoy.Key
	}
	if !slices.Contains([]string{"100", "101", "102", "103", "200", "201", "202", "203", "204", "205", "206", "207", "208", "226", "300", "301", "302", "303", "304", "305", "307", "308", "400", "401", "402", "403", "404", "405", "406", "407", "408", "409", "410", "411", "412", "413", "414", "415", "416", "417", "418", "421", "422", "423", "424", "426", "428", "429", "431", "451", "500", "501", "502", "503", "504", "505", "506", "507", "508", "510", "511"}, i.injectString) {
		return fmt.Errorf("status is not a valid code: %v", i.injectString)
	}
  } else {
    i.injectString = i.curFilter.Decoy.Value
	}
  return nil
}

func (i *injectHeader) isRelevantVerb() bool {
	httpMethod := i.headers[":method"]
	if i.request != nil && i.request.Headers[":method"] != "" {
		httpMethod = i.request.Headers[":method"]
	}
	return (i.curFilter.Inject.Store.WithVerb == httpMethod) || (i.curFilter.Inject.Store.WithVerb == "")
}

func (i *injectHeader) isRelevantPathResponse() (bool, error) {
  request := i.curFilter.Inject.Store.InResponse
  if request == "" {
    return false, nil
  }
	regEx, err := regexp.Compile(i.curFilter.Inject.Store.InResponse)
	if err != nil {
		return false, err
	}
	return regEx.MatchString(i.request.Headers[":path"]), nil
}

func (i *injectHeader) isRelevantPathRequest() (bool, error) {
  request := i.curFilter.Inject.Store.InRequest
  if request == "" {
    return false, nil
  }
	regEx, err := regexp.Compile(i.curFilter.Inject.Store.InResponse)
	if err != nil {
		return false, err
	}
	return regEx.MatchString(i.headers[":path"]), nil
}

func (i *injectHeader) storeMethodCharacter() error {
	var err error = nil
	var charIndex int

	if config_proxy.Debug { proxywasm.LogWarnf("header content before injection: %v", i.headerContent) } //debug
	charIndex, err = strconv.Atoi(i.curFilter.Inject.Store.At.Property)
	if err != nil {
		err = fmt.Errorf("store.at.method: character, can not convert property \"%s\" to int: \"%s\"", i.curFilter.Inject.Store.At.Property, err.Error())
	}
	if charIndex == 0 && i.curFilter.Inject.Store.At.Property[0] == '-' {
		charIndex = len(i.headerContent) // -0 => append to end
	}

	if charIndex >= 0 {
		if charIndex > len(i.headerContent) {
			charIndex = len(i.headerContent) // append to end
		}
		i.headerContent = i.headerContent[:charIndex] + i.injectString + i.headerContent[charIndex:]
	} else {
		if charIndex < -len(i.headerContent) {
			charIndex = 0 // insert at start
		}
		fmt.Println("using this other case")
		i.headerContent = i.headerContent[:len(i.headerContent)+charIndex] + i.injectString + i.headerContent[len(i.headerContent)+charIndex:]
	}
	if config_proxy.Debug { proxywasm.LogWarnf("header content after injection: %v", i.headerContent) } //debug

	return err
}

func (i *injectHeader) storeMethodLine() error {
	var err error = nil
	var charIndex int
	var lineNo int

	lineNo, err = strconv.Atoi(i.curFilter.Inject.Store.At.Property)
	if err != nil {
		return fmt.Errorf("store.at.method: line, can not convert property \"%s\" to int: \"%s\"", i.curFilter.Inject.Store.At.Property, err.Error())
	}

	noOfLines := strings.Count(i.headerContent, "\n")
	if lineNo >= 0 {
		if lineNo > noOfLines {
			i.headerContent += i.injectString + "\n" // append to end
			return err
		}
	} else {
		lineNo += noOfLines
		if lineNo < 0 {
			i.headerContent = i.injectString + "\n" + i.headerContent // insert at start
			return err
		}
	}
	charIndex = indexOfNthLine(i.headerContent, lineNo) // after new line char
	i.headerContent = i.headerContent[0:charIndex] + i.injectString + "\n" + i.headerContent[charIndex:]

	return err
}

func (i *injectHeader) storeMethodBefore() error {
	var err error = nil

  regexVal := i.curFilter.Inject.Store.At.Property
  if regexVal == "" {
    return fmt.Errorf("inject.store.at.property can not be empty")
  }
	regExp, err := regexp.Compile(regexVal)
	if err != nil {
		return fmt.Errorf("store.at.method: before, property \"%s\" is not a valid regex: %s", i.curFilter.Inject.Store.At.Property, err.Error())
	}

	matchPosition := regExp.FindStringIndex(i.headerContent)
	if len(matchPosition) == 2 { // found match
		i.headerContent = i.headerContent[0:matchPosition[0]] + i.injectString + i.headerContent[matchPosition[0]:]
	}

	return err
}

func (i *injectHeader) storeMethodAfter() error {
	var err error = nil

  regexVal := i.curFilter.Inject.Store.At.Property
  if regexVal == "" {
    return fmt.Errorf("inject.store.at.property can not be empty")
  }
	regExp, err := regexp.Compile(regexVal)
	if err != nil {
		return fmt.Errorf("store.at.method: before, property \"%s\" is not a valid regex: %s", i.curFilter.Inject.Store.At.Property, err.Error())
	}

  regexVal = i.headerContent
  if regexVal == "" {
    return fmt.Errorf("inject.store.at.property can not be empty")
  }
	matchPosition := regExp.FindStringIndex(regexVal)
	if len(matchPosition) == 2 { // found match
		i.headerContent = i.headerContent[0:matchPosition[1]] + i.injectString + i.headerContent[matchPosition[1]:]
	}

	return err
}

func (i *injectHeader) storeMethodReplace() error {
	if config_proxy.Debug {proxywasm.LogWarnf("called replace on header \n headerContent before: %s\n", i.headerContent) } //debug
	var err error = nil

  regexVal := i.curFilter.Inject.Store.At.Property
  if regexVal == "" {
    return fmt.Errorf("inject.store.at.property can not be empty")
  }
	regExp, err := regexp.Compile(regexVal)
	if err != nil {
		return fmt.Errorf("store.at.method: before, property \"%s\" is not a valid regex: %s", i.curFilter.Inject.Store.At.Property, err.Error())
	}

	matchPosition := regExp.FindStringIndex(i.headerContent)
	if len(matchPosition) == 2 { // found match
		i.headerContent = i.headerContent[0:matchPosition[0]] + i.injectString + i.headerContent[matchPosition[1]:]
	}

	if config_proxy.Debug { proxywasm.LogWarnf("replace done \n headerContent after: %s\n", i.headerContent) }//debug
	return err
}

func (i *injectHeader) storeMethodAlways() error {
	var err error = nil

  regexVal := i.curFilter.Inject.Store.At.Property
  if regexVal == "" {
    return fmt.Errorf("inject.store.at.property can not be empty")
  }
	regExp, err := regexp.Compile(regexVal)
	if err != nil {
		return fmt.Errorf("store.at.method: before, property \"%s\" is not a valid regex: %s", i.curFilter.Inject.Store.At.Property, err.Error())
	}

	for {
		matchPosition := regExp.FindStringIndex(i.headerContent)
		if len(matchPosition) != 2 { // did not find match
			break
		}
		i.headerContent = i.headerContent[0:matchPosition[0]] + i.injectString + i.headerContent[matchPosition[1]:]
	}

	return err
}

func normalizeKey(key string) string {
	// normalize header and cookie key
	// remove outer spaces and convert to lower case
	return strings.Trim(strings.ToLower(key), " ")
}

func (i *injectHeader) mapToSortedHeaderArray() {
	// orders headers alphabetically (by value, not key) to make decoys less obvious
	// converts from map[string]string{[key]value} to [][2]string{{key, value})
	headerMap := i.headers
	headers := make([][2]string, 0, len(headerMap))
	for key, value := range headerMap {
		headers = append(headers, [2]string{key, value})
	}
	sort.Slice(headers, func(i, j int) bool {
		return headers[i][1] > headers[j][1]
	})
	i.injectedHeaders = headers
}

func mapToSortedArray(headerMap map[string]string) []string {
	// orders cookies alphabetically to make decoys less obvious
	// converts from map[string]string{[key]value} to []string{{"key=value"})
	array := make([]string, 0, len(headerMap))
	for key, value := range headerMap {
		array = append(array, key+"="+value)
	}

  // sort
	sort.Slice(array, func(i, j int) bool {
		return array[i] > array[j]
	})
	return array
}

func (i *injectHeader) storeInjectedHeadersInRequest() {
  i.request = &shared.HttpRequest{ nil, i.headers, i.cookies }
}
