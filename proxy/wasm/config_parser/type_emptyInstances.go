package config_parser

import (
	//"strings"
)

func EmptyConfig() Config {
  return Config{ []FilterType{} }
}

func EmptyCondition() ConditionType{
  return ConditionType{"", "", ""}
} 

func EmptyConditions() []ConditionType{
  return []ConditionType{}
} 

func EmptyFilter() FilterType {
  return FilterType{ EmptyDecoy(), EmptyInject(), EmptyDetect() }
}

func EmptyDecoy() DecoyType {
  return DecoyType{"", "", "", "", "", ""}
}

func EmptyInject() InjectType {
  return InjectType{ EmptyStore(), EmptyConditions(), EmptyConditions() }
}

func EmptyStore() StoreType {
  return StoreType{ "", "", "", "", EmptyAt()}
}

func EmptyAt() AtType {
 return AtType{"", ""}
}

func EmptyDetect() DetectType {
  return DetectType{ EmptySeek(), EmptyAlert() }
}

func EmptySeek() SeekType {
  return SeekType{"", "", "", ""}
}

func EmptyAlert() AlertType {
  return AlertType{"", false, false, false, false}
}
