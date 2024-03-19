package shared

import (
	"sundew/config_parser"
  "sundew/config_proxy"
	"fmt"
	"regexp"
	"strings"

	"github.com/zach-klippenstein/goregen"
  "github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
)

type HttpRequest struct {
  Body *string
  Headers map[string]string
  Cookies map[string]string
}

func RegexGen(regex *string) (*string, error) {
  regstr, err := regen.Generate(*regex)
  if err != nil {
      return nil, err
  } else {
      return &regstr, nil
  }
}

func RegexMatches(regex, match *string) (bool, error) {
  if *regex == "" || *match == "" {
    return false, nil
  }
  if regex == nil || match == nil {
    return false, fmt.Errorf("regex, match: cant be nil")
  }
	regexCompiled, err := regexp.Compile(*regex)
	if err != nil {
    return false, fmt.Errorf( "invalid regex %v: %v", *regex, err.Error())
	}
  return regexCompiled.MatchString(*match), nil
}

func StringMatches(match, str *string) (bool, error) {
  if match == nil || str == nil {
    return false, fmt.Errorf("could not compare strings: nil value")
  }
  return strings.Contains(*str, *match), nil
  //return (*match == *str), nil
}

func KeyCombinedMatch(filter *config_parser.FilterType, query *string) (err error, keyMatch, combinedMatch bool){
  // for detection
  // uses dynamicKey & dynamicValue from filter if available else uses Key & Value
  // matches key against query and key+separator+value against query
  // uses regex for dynamic and string match for regular

  err = nil
  separator := filter.Decoy.Separator

  key := filter.Decoy.DynamicKey 
  if key == "" {
    key = filter.Decoy.Key
    keyMatch, err = StringMatches(&key, query)
    if err != nil {
      return fmt.Errorf("invalid key strings: %v", err.Error()), false, false
    }
  } else {
    keyMatch, err = RegexMatches(&key, query)
    if err != nil {
      return fmt.Errorf("invalid key regex: %v", err.Error()), false, false
    }
  }

  value := filter.Decoy.DynamicValue 
  if value == "" {
    value = key+separator+filter.Decoy.Value
    combinedMatch, err = StringMatches(&value, query)
    if err != nil {
      return fmt.Errorf("invalid value strings: %v", err.Error()), false, false
    }
  } else {
    value = key+separator+value
    if config_proxy.Debug { proxywasm.LogWarnf("reg str %v", value) } //Debug
    combinedMatch, err = RegexMatches(&value, query)
    if err != nil {
      return fmt.Errorf("invalid value regex: %v", err.Error()), false, false
    }
  }
  return
}
