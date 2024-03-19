package inject

import (
	"sundew/config_parser"
	"sundew/shared"
	"sundew/config_proxy"

	"fmt"
	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
	"regexp"
	"strconv"
	"strings"
)

type injecterBody struct {
	conf         *config_parser.Config
	curFilter    *config_parser.FilterType
  curKey       *string
	responseBody string
	injectString string
  request *shared.HttpRequest
}

func OnHttpRequestBody(request *shared.HttpRequest, originalBody []byte, conf *config_parser.Config) (error, []byte) {
	i := injecterBody{conf, nil, nil, string(originalBody), "", request}

	if config_proxy.Debug { proxywasm.LogWarn("*** inject request body ***") } //debug
	for ind := 0; ind < len(i.conf.Filters); ind++ {
		i.curFilter = &i.conf.Filters[ind]

    err, conditionsApply := i.checkConditionsRequest()
    if err != nil {
      return err, nil
    }
    if !conditionsApply { //skip
      continue
    }

    if config_proxy.Debug { proxywasm.LogWarnf("did not skip, apply filter[%v] now", ind) } //debug

		err = i.injectDecoyInResponse()
		if err != nil {
			return err, nil
		}
	}
  //i.responseBody = i.responseBody +"\n\n this is the first insert"
  //proxywasm.LogWarnf("this is the response: \n%v\n", i.responseBody)
	return nil, []byte(i.responseBody)
}

func OnHttpResponseBody(request *shared.HttpRequest, originalBody []byte, conf *config_parser.Config) (error, []byte) {
	i := injecterBody{conf, nil, nil, string(originalBody), "", request}

	if config_proxy.Debug { proxywasm.LogWarn("*** inject reponse body ***") } //debug
	for ind := 0; ind < len(i.conf.Filters); ind++ {
		i.curFilter = &i.conf.Filters[ind]

    err, conditionsApply := i.checkConditionsResponse()
    if err != nil {
      return err, nil
    }
    if !conditionsApply { //skip
      continue
    }

    if config_proxy.Debug { proxywasm.LogWarnf("did not skip, apply filter[%v] now", ind) } //debug

		err = i.injectDecoyInResponse()
		if err != nil {
			return err, nil
		}
	}
  //i.responseBody = i.responseBody +"\n\n this is the first insert"
  //proxywasm.LogWarnf("this is the response: \n%v\n", i.responseBody)
	return nil, []byte(i.responseBody)
}

func (i *injecterBody) checkConditionsRequest() (error, bool) {
  httpMethod := i.request.Headers[":method"]
  httpReqUrl := i.request.Headers[":path"]

  if isRelReq, err := i.relevantRequest_request(httpReqUrl); err != nil {
    return fmt.Errorf("store.forRequest: can not compile regEx: %v", err.Error()), false
  } else if !i.relevantVerb(httpMethod) || !isRelReq {
    //proxywasm.LogWarn("skipped because wrong verb or request") //debug
    return nil, false
  }

  if i.curFilter.Inject.Store.As != "body" {
    //proxywasm.LogWarn("skipped because not body") //debug
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
      //proxywasm.LogWarnf("skipped because %v=%v could not be found in %v", condition.Key, condition.Value, condition.In) //debug
      return nil, false
    }
  }
  for _, condition := range i.curFilter.Inject.WhenFalse {
    err, applies := WhenFalse(i.request, &condition) 
    if err != nil {
      return err, false
    }
    if !applies {
      //proxywasm.LogWarnf("skipped because %v=%v was found in %v", condition.Key, condition.Value, condition.In) //debug
      return nil, false
    }
  }
  return nil, true
}
func (i *injecterBody) checkConditionsResponse() (error, bool) {
  httpMethod := i.request.Headers[":method"]
  httpReqUrl := i.request.Headers[":path"]

  if isRelReq, err := i.relevantRequest_response(httpReqUrl); err != nil {
    return fmt.Errorf("store.forRequest: can not compile regEx: %v", err.Error()), false
  } else if !i.relevantVerb(httpMethod) || !isRelReq {
    //proxywasm.LogWarn("skipped because wrong verb or request") //debug
    return nil, false
  }

  if i.curFilter.Inject.Store.As != "body" {
    //proxywasm.LogWarn("skipped because not body") //debug
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
      //proxywasm.LogWarnf("skipped because %v=%v could not be found in %v", condition.Key, condition.Value, condition.In) //debug
      return nil, false
    }
  }
  for _, condition := range i.curFilter.Inject.WhenFalse {
    err, applies := WhenFalse(i.request, &condition) 
    if err != nil {
      return err, false
    }
    if !applies {
      //proxywasm.LogWarnf("skipped because %v=%v was found in %v", condition.Key, condition.Value, condition.In) //debug
      return nil, false
    }
  }
  return nil, true
}

func (i *injecterBody) relevantVerb(httpMethod string) bool {
	res := (i.curFilter.Inject.Store.WithVerb == httpMethod) || (i.curFilter.Inject.Store.WithVerb == "")
	if !res {
	//	fmt.Printf("Method does not match: %s != %s \n", i.curFilter.Inject.Store.WithVerb, httpMethod) //debug
	}
	return res
}

func (i *injecterBody) relevantRequest_request(httpReqUrl string) (bool, error) {
  regexVal := i.curFilter.Inject.Store.InRequest
  if regexVal == "" {
    return false, nil
  }
	regEx, err := regexp.Compile(regexVal)
	if err != nil {
		return false, err
	}
	res := regEx.MatchString(httpReqUrl)
	if !res {
		//fmt.Printf("Path does not match: %s != %s", httpReqUrl, i.curFilter.Inject.Store.ForRequest) //debug
	}
	return res, nil
}

func (i *injecterBody) relevantRequest_response(httpReqUrl string) (bool, error) {
  regexVal := i.curFilter.Inject.Store.InResponse
  if regexVal == "" {
    return false, nil
  }
	regEx, err := regexp.Compile(regexVal)
	if err != nil {
		return false, err
	}
	res := regEx.MatchString(httpReqUrl)
	if !res {
		//fmt.Printf("Path does not match: %s != %s", httpReqUrl, i.curFilter.Inject.Store.ForRequest) //debug
	}
	return res, nil
}

func (i *injecterBody) injectDecoyInResponse() error {
	var err error

	err = i.setInjectString()
  if err != nil {
    return err
  }
  //proxywasm.LogWarnf("inject string: %v", i.injectString) //debug

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

	if err != nil {
		return err
	}
	return nil
}

func (i *injecterBody) setInjectString() error {
	// sets i.injectString from curFilter config
	i.injectString = ""
  dynVal := &i.curFilter.Decoy.DynamicValue
  dynKey := &i.curFilter.Decoy.DynamicKey
  str := &i.curFilter.Decoy.String
  var err error
  var key *string
  var sep *string
  var val *string

  if *str != ""{ // if string exists: use it, else if dynamicValue exists, generate from it, else use value
    i.injectString = *str
  } else {
    if  *dynKey != "" { // if it exists use dynKey, else key
      key, err = shared.RegexGen(dynKey)
      if err != nil {
        return fmt.Errorf("could not set inject string: %v", err.Error())
      }
    } else {
      key = &i.curFilter.Decoy.Key
    }
    if  *dynVal != "" { // if it exists use dynVal, else val 
      val, err = shared.RegexGen(dynVal)
      if err != nil {
        return fmt.Errorf("could not set inject string: %v", err.Error())
      }
    } else { 
      val = &i.curFilter.Decoy.Value
    }
    if i.curFilter.Decoy.Separator == "" {
      sepStr := "="
      sep = &sepStr
    } else { sep = &i.curFilter.Decoy.Separator }
		i.injectString = *key + *sep + *val
	} 
  i.injectString = strings.ReplaceAll(i.injectString, "\\n", "\n")
  return nil
}

func (i *injecterBody) storeMethodCharacter() error {
	var err error = nil
	var charIndex int
	if config_proxy.Debug { proxywasm.LogWarnf("inserting %v", i.injectString) }

	charIndex, err = strconv.Atoi(i.curFilter.Inject.Store.At.Property)
	fmt.Println("converted charInd is: ", charIndex)
	if err != nil {
		err = fmt.Errorf("store.at.method: character, can not convert property \"%s\" to int: \"%s\"", i.curFilter.Inject.Store.At.Property, err.Error())
	}
	if charIndex == 0 && i.curFilter.Inject.Store.At.Property[0] == '-' {
		charIndex = len(i.responseBody) // -0 => append to end
	}

	if charIndex >= 0 {
		if charIndex > len(i.responseBody) {
			charIndex = len(i.responseBody) // append to end
		}
		i.responseBody = i.responseBody[:charIndex] + i.injectString + i.responseBody[charIndex:]
	} else {
		if charIndex < -len(i.responseBody) {
			charIndex = 0 // insert at start
		}
		//fmt.Println("using this other case") //debug
		i.responseBody = i.responseBody[:len(i.responseBody)+charIndex] + i.injectString + i.responseBody[len(i.responseBody)+charIndex:]
	}

	return err
}

func (i *injecterBody) storeMethodLine() error {
	var err error = nil
	var charIndex int
	var lineNo int

	lineNo, err = strconv.Atoi(i.curFilter.Inject.Store.At.Property)
	if err != nil {
		return fmt.Errorf("store.at.method: line, can not convert property \"%s\" to int: \"%s\"", i.curFilter.Inject.Store.At.Property, err.Error())
	}

	noOfLines := strings.Count(i.responseBody, "\n")
	if lineNo >= 0 {
		if lineNo > noOfLines {
			i.responseBody += i.injectString + "\n" // append to end
			return err
		}
	} else {
		lineNo += noOfLines
		if lineNo < 0 {
			i.responseBody = i.injectString + "\n" + i.responseBody // insert at start
			return err
		}
	}
	charIndex = indexOfNthLine(i.responseBody, lineNo) // after new line char
	i.responseBody = i.responseBody[0:charIndex] + i.injectString + "\n" + i.responseBody[charIndex:]

  //proxywasm.LogWarnf("injected string: %v", i.injectString) //debug

	return err
}

func (i *injecterBody) storeMethodBefore() error {
	var err error = nil

  regexVal := i.curFilter.Inject.Store.At.Property
  if regexVal == "" {
    return fmt.Errorf("Inject.store.at.property can not be empty")
  }
	regExp, err := regexp.Compile(regexVal)
	if err != nil {
		return fmt.Errorf("store.at.method: before, property \"%s\" is not a valid regex: %s", i.curFilter.Inject.Store.At.Property, err.Error())
	}

	matchPosition := regExp.FindStringIndex(i.responseBody)
	if len(matchPosition) == 2 { // found match
		i.responseBody = i.responseBody[0:matchPosition[0]] + i.injectString + i.responseBody[matchPosition[0]:]
	}

	return err
}

func (i *injecterBody) storeMethodAfter() error {
	var err error = nil

  regexVal := i.curFilter.Inject.Store.At.Property
  if regexVal == "" {
    return fmt.Errorf("Inject.store.at.property can not be empty")
  }
	regExp, err := regexp.Compile(regexVal)
	if err != nil {
		return fmt.Errorf("store.at.method: before, property \"%s\" is not a valid regex: %s", i.curFilter.Inject.Store.At.Property, err.Error())
	}

  //proxywasm.LogWarnf("insert is: %v", i.injectString) //debug
	matchPosition := regExp.FindStringIndex(i.responseBody)
	if len(matchPosition) == 2 { // found match
		i.responseBody = i.responseBody[:matchPosition[1]] + i.injectString + i.responseBody[matchPosition[1]:]
	}

	return err
}

func (i *injecterBody) storeMethodReplace() error {
	var err error = nil

  regexVal := i.curFilter.Inject.Store.At.Property
  if regexVal == "" {
    return fmt.Errorf("Inject.store.at.property can not be empty")
  }
	regExp, err := regexp.Compile(regexVal)
	if err != nil {
		return fmt.Errorf("store.at.method: before, property \"%s\" is not a valid regex: %s", i.curFilter.Inject.Store.At.Property, err.Error())
	}

	matchPosition := regExp.FindStringIndex(i.responseBody)
	if len(matchPosition) == 2 { // found match
		i.responseBody = i.responseBody[0:matchPosition[0]] + i.injectString + i.responseBody[matchPosition[1]:]
	}

	return err
}

func (i *injecterBody) storeMethodAlways() error {
	var err error = nil

  regexVal := i.curFilter.Inject.Store.At.Property
  if regexVal == "" {
    return fmt.Errorf("Inject.store.at.property can not be empty")
  }
	regExp, err := regexp.Compile(regexVal)
	if err != nil {
		return fmt.Errorf("store.at.method: before, property \"%s\" is not a valid regex: %s", i.curFilter.Inject.Store.At.Property, err.Error())
	}

	for {
		matchPosition := regExp.FindStringIndex(i.responseBody)
		if len(matchPosition) != 2 { // did not find match
			break
		}
		i.responseBody = i.responseBody[0:matchPosition[0]] + i.injectString + i.responseBody[matchPosition[1]:]
	}

	return err
}

func indexOfNthLine(s string, N int) int {
	// returns character index of first char in line N of string s
	// returns -1 if s has less than N lines
	// indexOfNthLine("hi \nbye \nhow are you \n", 1) = index of 'b'
	// indexOfNthLine("hi \n", 2) = -1
	curLine := 0
	curInd := 0
	for {
		if curLine == N {
			return curInd
		}
		subInd := strings.Index(s[curInd:], "\n")
		if subInd < 0 {
			return -1
		}
		curInd += subInd + 1
		curLine++
	}
}
