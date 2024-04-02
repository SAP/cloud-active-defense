package inject

import (
	"sundew/config_parser"
	"sundew/shared"

	"fmt"
	"net/url"

	"regexp"

	//"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
)

func WhenTrue(request *shared.HttpRequest, condition *config_parser.ConditionType) (error, bool) {
  err, applies := checkCondition(request, condition)
  return err, applies
}

func WhenFalse(request *shared.HttpRequest, condition *config_parser.ConditionType) (error, bool) {
  err, applies := checkCondition(request, condition)
  return err, !applies
}

func checkCondition(request *shared.HttpRequest, condition *config_parser.ConditionType) (error, bool) {
  if request == nil {
    return fmt.Errorf("request cant be nil"), false
  }

  switch condition.In {
  case "cookie":
    value, exists := request.Cookies[condition.Key]
    if exists {
      if condition.Value == "" {
        return nil, false
      }

      match, err := shared.RegexMatches(&condition.Value, &value)
      if err != nil {
        return fmt.Errorf("could not match regex: %v", err.Error()), false
      }

      return nil, match
    }
    return nil, false
  case "header":
    value, exists := request.Headers[condition.Key]
    if exists {
      if condition.Value == "" {
        return nil, false
      }
      match, err := shared.RegexMatches(&condition.Value, &value)
      if err != nil{
        return fmt.Errorf("regex match error: %v", err.Error()), false
      }
      return nil, match
    }
    return nil, false
  case "url":
    return checkUrl(request.Headers[":path"], condition)
  case "getParam":
    return checkGetParams(request, condition)
  case "postParams":
    return checkPostParams(request, condition)
  case "payload":
    return checkBody(request, condition)
  default:
    return fmt.Errorf("condition.in parameter is invalid"), false
  }
}

func checkUrl(path string, condition *config_parser.ConditionType) (error, bool) {
  url, err := url.Parse(path)
  if err != nil {
    return err, false
  }
  path = url.Path // only path, no get params

  if condition.Value == "" {
    return nil, false
  }

  match, err := shared.RegexMatches(&condition.Value, &path)
  if err != nil {
    return fmt.Errorf("regex match error: %v", err.Error()), false
  }
  return nil, match
}

func checkGetParams(request *shared.HttpRequest, condition *config_parser.ConditionType) (error, bool) {
  if request.Headers[":method"] != "GET" {
    return nil, false
  }

  url, err := url.Parse(request.Headers[":path"])
  if err != nil {
    return err, false
  }

  urlParams := url.Query()
  values, exists := urlParams[condition.Key]
  if exists {
    for _, value := range values {
      if condition.Value == "" {
        return nil, false
      }
      match, err := shared.RegexMatches(&condition.Value, &value)
      if err != nil {
        return fmt.Errorf("regex match error: %v", err.Error()), false
      }
      return nil, match
    }
  }

  return nil, false
}

func checkPostParams(request *shared.HttpRequest, condition *config_parser.ConditionType) (error, bool) {
  if request.Body == nil {
    return fmt.Errorf("can not check body conditions in header injection"), false
  }
  if request.Headers[":method"] != "POST" {
    return nil, false
  }

  if contentType := request.Headers["content-type"]; contentType == "application/x-www-form-urlencoded" {
    value := condition.Key+"="+condition.Value
    if value == "" {
      return nil, false
    }
    regex, err := regexp.Compile(value)
    if err != nil {
      return err, false
    }
    if regex.Match([]byte(*request.Body)) {
      return nil, true
    }

  } else {
    return fmt.Errorf("content-type %v is not implemented", contentType), false
  }
  return nil, false
}

func checkBody(request *shared.HttpRequest, condition *config_parser.ConditionType) (error, bool) {
  if request.Body == nil {
    return fmt.Errorf("can not check body conditions in header injection"), false
  }
  value := ""
  if condition.Key != "" {
    value = condition.Key+"="+condition.Value
  } else {
    value = condition.Value
  }
  if value == "" {
    return nil, false
  }
  regex, err := regexp.Compile(value)
  if err != nil {
    return err, false
  }

  if request.Body == nil {
    return fmt.Errorf("request body can not be nil"), false
  } 
  if regex.Match([]byte(*request.Body)) {
    return nil, true
  }
  return nil, false
}
