package config_parser

import (
	"errors"
	"fmt"
	"strconv"
)


type configErr struct {
	Err   error
	Place string
}

type validator struct {
	errArr              []*configErr
	currentFilterInd    int
	currentConditionInd int
	currentPlace        string
}

func newValidator() *validator {
	return &validator{
		errArr:              []*configErr{},
		currentFilterInd:    -1,
		currentConditionInd: -1,
		currentPlace:        "",
	}
}

func (v *validator) addError(place string, errorMsg string) {
	v.errArr = append(v.errArr, &configErr{
		Err:   errors.New(errorMsg),
		Place: place,
	})
}

func (v *validator) printErrors() {
	if len(v.errArr) == 0 {
		//proxywasm.LogWarn("Config validated without errors")
	} else {
		fmt.Println("Config contains errors: ")
		for _, err := range v.errArr {
			fmt.Println("at", err.Place, ":", err.Err.Error())
		}
	}
}

func (v *validator) Validate(config *Config) error {
	v.validateFilters(config.Decoys.Filters)
	v.printErrors()
	if len(v.errArr) == 0 {
		return nil
	}
	return fmt.Errorf("config is invalid")
}

/* validators for config types */
/*** 						***/

func (v *validator) validateFilters(filters []FilterType) {
	v.currentPlace = "filters"
	if filters == nil || len(filters) == 0 {
    return
		//v.addError(v.currentPlace, "No filters specified")
	} else {
		filter := FilterType{}
		for v.currentFilterInd, filter = range filters {
      v.validateDecoy(filter.Decoy)
			v.validateInject(filter.Inject)
			v.validateDetect(filter.Detect)
		}
	}
}

func (v *validator) validateSessionConf(session SessionConfig) {
	v.validateSession(session.Session)
	v.validateUsername(session.Username)
}

func (v *validator) validateSession(session SessionType) {
	if session == EmptySession() {
		return
	}
	if breaksRequired(session.Key)  {
		v.addError("session.key ", "can not be empty ")
	}
	if validInSession(session.In) {
		v.addError("session.in", "needs to be cookie or header")
	}
}

func (v *validator) validateUsername(username UsernameType) {
	if username == EmptyUsername() {
		return
	}
	if breaksRequired(username.Key) && (username.In == "cookie" || username.In == "header") {
		v.addError("username.key", "can not be empty for cookier or header")
	}
	if validInUsername(username.In) {
		v.addError("username.in", "needs to be cookie, header or payload")
	}
	if breaksRequired(username.Value) && username.In == "payload" {
		v.addError("username.value", "can not be empty for payload")
	}
	if invalidRegex(username.Value) {
		v.addError("username.dynamicKey", "needs to be a valid regex")
	}
}

func (v *validator) validateDecoy(decoy DecoyType) {
	v.currentPlace = "filters[" + strconv.Itoa(v.currentFilterInd) + "].decoy"
  if decoy == EmptyDecoy() {
    v.addError(v.currentPlace, "can not be empty")
  }
	if breaksRequired(decoy.Key) && breaksRequired(decoy.DynamicKey) {
		v.addError(v.currentPlace+".key and dynamicKey", "can not both be empty ")
	}
	if invalidRegex(decoy.DynamicKey) {
		v.addError(v.currentPlace+".dynamicKey", "needs to be valid regex")
	}
	if invalidRegex(decoy.DynamicValue) {
		v.addError(v.currentPlace+".dynamicValue", "needs to be valid regex")
	}
}

func (v *validator) validateInject(obj InjectType) {
	v.validateStore(obj.Store)
	cond := ConditionType{}
	for v.currentConditionInd, cond = range obj.WhenTrue {
		v.validateWhenTrue(cond)
	}
	for v.currentConditionInd, cond = range obj.WhenFalse {
		v.validateWhenFalse(cond)
	}
}

func (v *validator) validateStore(obj StoreType) {
	v.currentPlace = "filters[" + strconv.Itoa(v.currentFilterInd) + "].inject.store"
  if obj == EmptyStore() {
    return 
  }
	if invalidRegex(obj.InResponse) {
		v.addError(v.currentPlace+".inResponse", "needs to be valid regex")
	}
	if invalidRegex(obj.InRequest)  {
		v.addError(v.currentPlace+".forRequest", "needs to be valid regex")
	}
	if !validHttpVerb(obj.WithVerb) && !breaksRequired(obj.WithVerb){
		v.addError(v.currentPlace+".withVerb", "needs to be a valid HTTP verb or empty")
	}
	if !validAs(obj.As) {
		v.addError(v.currentPlace+".as", "needs to be cookie, header or body")
	}
	if !validInjectionMethod(obj.At.Method) && !breaksRequired(obj.At.Method){
		v.addError(v.currentPlace+".at.method", "needs to be valid injection method or empty")
	}
	if !propertyMatchesInjectionMethod(obj.At.Property, obj.At.Method) && !breaksRequired(obj.At.Method){
		v.addError(v.currentPlace+".at.property", "property needs to match injection method: numbers for line and character, regex for rest")
	}
}

func (v *validator) validateWhenTrue(obj ConditionType) {
	v.currentPlace = "filters[" + strconv.Itoa(v.currentFilterInd) + "].inject.whenTrue[" + strconv.Itoa(v.currentConditionInd) + "]"
  if obj == EmptyCondition() {
    return
  }
	if breaksRequired(obj.Key) {
		v.addError(v.currentPlace+".key", "is required and can not be empty")
	}
	if breaksRequired(obj.Value) {
		v.addError(v.currentPlace+".value", "is required and can not be empty")
	}
	if breaksRequired(obj.In) {
		v.addError(v.currentPlace+".in", "is required and can not be empty")
	}
	if !validInRequest(obj.In) {
		v.addError(v.currentPlace+".in", "needs to be cookie, header, url, getParam, postParams or payload")
	}
}

func (v *validator) validateWhenFalse(obj ConditionType) {
	v.currentPlace = "filters[" + strconv.Itoa(v.currentFilterInd) + "].inject.whenFalse[" + strconv.Itoa(v.currentConditionInd) + "]"
  if obj == EmptyCondition() {
    return
  }
	if breaksRequired(obj.Key) {
		v.addError(v.currentPlace+".key", "is required and can not be empty")
	}
	if breaksRequired(obj.Value) {
		v.addError(v.currentPlace+".value", "is required and can not be empty")
	}
	if breaksRequired(obj.In) {
		v.addError(v.currentPlace+".in", "is required and can not be empty")
	}
	if !validInRequest(obj.In) {
		v.addError(v.currentPlace+".in", "needs to be cookie, header, url, getParam, postParams or payload")
	}
}

func (v *validator) validateDetect(obj DetectType) {
	v.currentPlace = "filters[" + strconv.Itoa(v.currentFilterInd) + "].detect"
  if obj == EmptyDetect() {
    return
  }
	v.validateSeek(obj.Seek)
	v.validateAlert(obj.Alert)
}

func (v *validator) validateSeek(obj SeekType) {
	v.currentPlace = "filters[" + strconv.Itoa(v.currentFilterInd) + "].detect.seek"
  if obj == EmptySeek() {
    return
  }
	if invalidRegex(obj.InRequest) {
		v.addError(v.currentPlace+".inRequest", "needs to be valid regex")
	}
	if invalidRegex(obj.InResponse) {
		v.addError(v.currentPlace+".inResponse", "needs to be valid regex")
	}
	if !validHttpVerb(obj.WithVerb) && !breaksRequired(obj.WithVerb){
		v.addError(v.currentPlace+".withVerb", "needs to be a valid HTTP verb or empty")
	}
	if !validInRequest(obj.In) {
		v.addError(v.currentPlace+".in", "needs to be cookie, header, url, getParam, postParams or payload")
	}
}

func (v *validator) validateAlert(obj AlertType) {
	v.currentPlace = "filters[" + strconv.Itoa(v.currentFilterInd) + "].detect.alert"
  if obj == EmptyAlert() {
    return
  }
	if !validSeverity(obj.Severity) {
		v.addError(v.currentPlace+".severity", "needs to be HIGH, MEDIUM or LOW")
	}
}

/* helper functions */
/*** 						***/

func validSeverity(s string) bool {
	e := Severity(s)
	switch e {
	case HIGH, MEDIUM, LOW:
		return true
	}
	return false
}

func propertyMatchesInjectionMethod(property string, injectionMethod string) bool {
	injMetEn := InjectMethod(injectionMethod)
	switch injMetEn {
	case line, character:
		_, err := strconv.Atoi(property)
		if err == nil {
			return true
		}
		return false
	case before, after, replace, always:
		return !invalidRegex(property)
	}
	return false
}

func validInjectionMethod(s string) bool {
	e := InjectMethod(s)
	switch e {
	case END, line, character, before, after, replace, always:
		return true
	}
	return false
}

func validInRequest(s string) bool {
	e := InRequest(s)
	switch e {
	case cookie, header, url, getParam, postParam, payload:
		return true
	}
	return false
}

func validAs(s string) bool {
	e := StoreAs(s)
	switch e {
	case cookie_as, header_as, body_as:
		return true
	}
	return false
}

func validHttpVerb(s string) bool {
	verb := HttpVerb(s)
	switch verb {
	case GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH, ALL:
		return true
	}
	return false
}

func breaksRequired(s string) bool {
	return s == ""
}

func invalidRegex(s string) bool {
	/*
		_, err := regexp.Compile(s)
		return err != nil && s != ""
	*/
	return false
}

func validInSession(s string) bool {
	e := InSession(s)
	switch e {
	case cookie_inS, header_inS:
		return true
	}
	return false
}

func validInUsername(s string) bool {
	e := InUsername(s)
	switch e {
	case cookie_inU, header_inU, payload_inU:
		return true
	}
	return false
}