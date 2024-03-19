package config_parser

import (
	"fmt"
  "crypto/sha1"
	//"strings"
)

type Config struct {
	Filters []FilterType `json:"filters"`
}

type FilterType struct {
	Decoy  DecoyType  `json:"decoy"`
	Inject InjectType `json:"inject"`
	Detect DetectType `json:"detect"`
}

type DecoyType struct {
	Key          string `json:"key"`
	DynamicKey   string `json:"dynamicKey"`
	Separator    string `json:"separator"`
	Value        string `json:"value"`
	DynamicValue string `json:"dynamicValue"` // regex
	String string `json:"string"`
}

type InjectType struct {
	Store     StoreType       `json:"store"`
	WhenTrue  []ConditionType `json:"whenTrue"`
	WhenFalse []ConditionType `json:"whenFalse"`
}

type ConditionType struct {
	Key   string `json:"key"`
	Value string `json:"value"`
	In    string `json:"in"`
}

type StoreType struct {
	InResponse string `json:"inResponse"`
	InRequest  string `json:"inRequest"`
	WithVerb   string `json:"withVerb"`
	As         string `json:"as"`
	At         AtType `json:"at"`
}

type AtType struct {
	Method   string `json:"method"`
	Property string `json:"property"`
}

type DetectType struct {
	Seek  SeekType  `json:"seek"`
	Alert AlertType `json:"alert"`
}

type SeekType struct {
	InRequest  string `json:"inRequest"`
	InResponse string `json:"inResponse"`
	WithVerb   string `json:"withVerb"`
	In         string `json:"in"`
}

type AlertType struct {
	Severity     string `json:"severity"`
	WhenSeen     bool   `json:"whenSeen"`
	WhenComplete bool   `json:"whenComplete"`
	WhenModified bool   `json:"whenModified"`
	WhenAbsent   bool   `json:"whenAbsent"`
}

func (c *Config) MakeChecksum() [20]byte{
  confStr := ""
	for _, filter := range c.Filters {
		confStr +=  filter.Decoy.Key
		confStr +=  filter.Decoy.DynamicKey
		confStr +=  filter.Decoy.Separator
		confStr +=  filter.Decoy.Value
		confStr +=  filter.Decoy.DynamicValue
		confStr +=  filter.Decoy.String
		confStr +=  filter.Inject.Store.InResponse
		confStr +=  filter.Inject.Store.WithVerb
		confStr +=  filter.Inject.Store.As
		confStr +=  filter.Inject.Store.At.Method
		confStr +=  filter.Inject.Store.At.Property
		for _, cond := range filter.Inject.WhenTrue {
			confStr +=  cond.Key
			confStr +=  cond.Value
			confStr +=  cond.In
		}
		for _, cond := range filter.Inject.WhenFalse {
			confStr +=  cond.Key
			confStr +=  cond.Value
			confStr +=  cond.In
		}
		confStr +=  filter.Detect.Seek.InRequest
		confStr +=  filter.Detect.Seek.InResponse
		confStr +=  filter.Detect.Seek.WithVerb
		confStr +=  filter.Detect.Seek.In
		confStr +=  filter.Detect.Alert.Severity
		confStr +=  fmt.Sprint(filter.Detect.Alert.WhenSeen)
		confStr +=  fmt.Sprint(filter.Detect.Alert.WhenComplete)
		confStr +=  fmt.Sprint(filter.Detect.Alert.WhenModified)
		confStr +=  fmt.Sprint(filter.Detect.Alert.WhenAbsent)
	}
  return sha1.Sum([]byte(confStr))
}

func (c *Config) MakeString() string{
  confStr := ""
	for filterind, filter := range c.Filters {
		confStr += fmt.Sprintf("filters[%d].decoy.key: %s \n", filterind, filter.Decoy.Key)
		confStr += fmt.Sprintf("filters[%d].decoy.dynamicKey: %s \n", filterind, filter.Decoy.DynamicKey)
		confStr += fmt.Sprintf("filters[%d].decoy.separator: %s \n", filterind, filter.Decoy.Separator)
		confStr += fmt.Sprintf("filters[%d].decoy.value: %s \n", filterind, filter.Decoy.Value)
		confStr += fmt.Sprintf("filters[%d].decoy.dynamicValue: %s \n", filterind, filter.Decoy.DynamicValue)
		confStr += fmt.Sprintf("filters[%d].decoy.string: %s \n", filterind, filter.Decoy.String)
		confStr += fmt.Sprintln()
		confStr += fmt.Sprintf("filters[%d].inject.store.inResponse: %s \n", filterind, filter.Inject.Store.InResponse)
		confStr += fmt.Sprintf("filters[%d].inject.store.withVerb: %s \n", filterind, filter.Inject.Store.WithVerb)
		confStr += fmt.Sprintf("filters[%d].inject.store.as: %s \n", filterind, filter.Inject.Store.As)
		confStr += fmt.Sprintf("filters[%d].inject.store.at.method: %s \n", filterind, filter.Inject.Store.At.Method)
		confStr += fmt.Sprintf("filters[%d].inject.store.at.property: %s \n", filterind, filter.Inject.Store.At.Property)
		confStr += fmt.Sprintln()
		for condInd, cond := range filter.Inject.WhenTrue {
			confStr += fmt.Sprintf("{\nfilters[%d].inject.store.whenTrue[%d].key: %s \n", filterind, condInd, cond.Key)
			confStr += fmt.Sprintf("filters[%d].inject.store.whenTrue[%d].value: %s \n", filterind, condInd, cond.Value)
			confStr += fmt.Sprintf("filters[%d].inject.store.whenTrue[%d].in: %s \n },\n", filterind, condInd, cond.In)
		}
		confStr += fmt.Sprintln()
		for condInd, cond := range filter.Inject.WhenFalse {
			confStr += fmt.Sprintf("{\nfilters[%d].inject.store.whenFalse[%d].key: %s \n", filterind, condInd, cond.Key)
			confStr += fmt.Sprintf("filters[%d].inject.store.whenFalse[%d].value: %s \n", filterind, condInd, cond.Value)
			confStr += fmt.Sprintf("filters[%d].inject.store.whenFalse[%d].in: %s \n},\n", filterind, condInd, cond.In)
		}
		confStr += fmt.Sprintln()
		confStr += fmt.Sprintf("filters[%d].detect.seek.inRequest: %s \n", filterind, filter.Detect.Seek.InRequest)
		confStr += fmt.Sprintf("filters[%d].detect.seek.inResponse: %s \n", filterind, filter.Detect.Seek.InResponse)
		confStr += fmt.Sprintf("filters[%d].detect.seek.withVerb: %s \n", filterind, filter.Detect.Seek.WithVerb)
		confStr += fmt.Sprintf("filters[%d].detect.seek.in: %s \n", filterind, filter.Detect.Seek.In)
		confStr += fmt.Sprintln()
		confStr += fmt.Sprintf("filters[%d].detect.alert.severity %s \n", filterind, filter.Detect.Alert.Severity)
		confStr += fmt.Sprintf("filters[%d].detect.alert.whenSeen: %v \n", filterind, filter.Detect.Alert.WhenSeen)
		confStr += fmt.Sprintf("filters[%d].detect.alert.whenComplete: %v \n", filterind, filter.Detect.Alert.WhenComplete)
		confStr += fmt.Sprintf("filters[%d].detect.alert.whenModified: %v \n", filterind, filter.Detect.Alert.WhenModified)
		confStr += fmt.Sprintf("filters[%d].detect.alert.whenAbsent: %v \n", filterind, filter.Detect.Alert.WhenAbsent)
	}
  return confStr
}

func (c *Config) Print() {
  fmt.Print(c.MakeString()) 
}
