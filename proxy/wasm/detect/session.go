package detect

import (
	"regexp"
	"sundew/config_parser"

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
)

func FindSession(request map[string]map[string]string, response map[string]map[string]string, config config_parser.AlertConfig) (string, string) {
	if (config == config_parser.EmptyAlertConfig() || config == config_parser.AlertConfig{}) {
		return "", ""
	}
	
	sessionValue := ""
	usernameValue := ""
	//Look for a session in response first
	if response != nil {
		session := getSession(response, config)
		sessionValue = session

		username := getUsername(response, config)
		usernameValue = username
	}
	if sessionValue == "" {
		session := getSession(request, config)
		sessionValue = session
	}
	if usernameValue == "" {
		username := getUsername(request, config)
		usernameValue = username
	}
	return sessionValue, usernameValue
}

func getSession(headers map[string]map[string]string, config config_parser.AlertConfig) string {
	if config.Session.In == "header" {
		if val, exists := headers["header"][config.Session.Key]; exists {
			return val
		}
	} else if config.Session.In == "cookie" {
		if val, exists := headers["cookie"][config.Session.Key]; exists {
			return val
		}
	}
	return ""
}

func getUsername(headers map[string]map[string]string, config config_parser.AlertConfig) string {
	if config.Username.In == "header" {
		if val, exists := headers["header"][config.Username.Key]; exists {
			return FindInValue(config.Username.Value, val)
		}
	} else if config.Username.In == "cookie" {
		if val, exists := headers["cookie"][config.Username.Key]; exists {
			return FindInValue(config.Username.Value, val)
		}
	} else if config.Username.In == "payload" && config.Username.Value != "" {
		rEKey, err := regexp.Compile(config.Username.Value)
		if err != nil {
			proxywasm.LogErrorf("username.value: \"%s\" is not a valid regex: %s", config.Username.Value, err.Error())
			return ""
		}
		foundValue := rEKey.FindStringSubmatch(headers["payload"]["payload"])
		if len(foundValue) > 1 {
			return foundValue[1]
		} else if len(foundValue) == 0 {
			return ""
		} else {
			return foundValue[0]
		}
	}
	return ""
}
func FindInValue(value, str string) string {
	if value != "" {
		rEValue, err := regexp.Compile(value)
		if err != nil {
			proxywasm.LogErrorf("username.Value: \"%s\" is not a valid regex: %s", value, err.Error())
			return str
		}
		foundValue := rEValue.FindStringSubmatch(str)
		if len(foundValue) > 1 {
			return foundValue[1]
		} else if len(foundValue) == 0 {
			return ""
		} else {
			return foundValue[0]
		} 
	}
	return str
}