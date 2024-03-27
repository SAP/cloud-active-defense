package config_parser

import (
	//"strings"
)

func EmptyConfig() Config {
  return Config{ DecoyConfig{}, SessionConfig{} }
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

func EmptySessionConfig() SessionConfig {
  return SessionConfig{ EmptySession(), EmptyUsername() }
}

func EmptySession() SessionType {
  return SessionType{"", "", ""}
}

func EmptyUsername() UsernameType {
  return UsernameType{"", "", ""}
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
