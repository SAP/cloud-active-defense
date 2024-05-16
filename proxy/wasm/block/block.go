package block

import (
	"fmt"
	"strconv"
	"strings"
	"sundew/config_parser"
	"sundew/detect"
	"time"

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
)


func IsBanned(blocklist []config_parser.BlocklistType, headers map[string]string, cookies map[string]string, config config_parser.AlertConfig) (string, string) {
	session, _ := detect.FindSession(map[string]map[string]string{"header": headers, "cookie": cookies, "payload": { "payload": "" }}, nil, config)
	sourceIP, err := proxywasm.GetProperty([]string{"source", "address"})
    if (err != nil) {
      fmt.Errorf("failed to fetch property: %v", err)
    }
	for _, bl := range blocklist {
		if (bl.Ip != "" && bl.Ip == strings.Split(string(sourceIP), ":")[0]) || (bl.Useragent != "" && bl.Useragent == headers["user-agent"]) || (bl.Session != "" && bl.Session == session) {
			return behaviorAction(bl), bl.Property
		}
	}
	return "continue", ""
}

func behaviorAction(bl config_parser.BlocklistType) string {
	if !isTimeout(bl){
		return "block"
	}
	if bl.Behavior == "drop" {
		return "pause"
	} else if bl.Behavior == "error" {
		err := proxywasm.SendHttpResponse(500, [][2]string{}, []byte("500 Error Server"), -1)
		if err != nil {
			proxywasm.LogErrorf("error when blocking blocklisted user: ", err)
		}
		return "pause"
	} else if bl.Behavior == "divert" {
		return "clone"
	} else if bl.Behavior == "throttle" {
		return "throttle"
	}
	return "continue"
}

func isTimeout(bl config_parser.BlocklistType) bool {
	if bl.Delay == "" || bl.Delay == "now" {
		return true
	}
	parsedDate, err := time.Parse("01-02-2006 15:04:05", bl.TimeDetected)
	if err != nil {
		proxywasm.LogErrorf("error parsing blocklist element '%s' when parsing time: %s", bl, err)
	}
	intDelay, _ := strconv.Atoi(bl.Delay[:len(bl.Delay)-1])
	var dateToCompare time.Time
	switch string(bl.Delay[len(bl.Delay)-1]) {
	case "s":
		dateToCompare = parsedDate.Add(time.Second * time.Duration(intDelay))
		break;
	case "m":
		dateToCompare = parsedDate.Add(time.Minute * time.Duration(intDelay))
		break;
	case "h":
		dateToCompare = parsedDate.Add(time.Hour * time.Duration(intDelay))
		break;
	}
	if time.Now().Compare(dateToCompare) == 1 {
		return true
	}
	return false
}

func AppendBlocklist(blocklist []config_parser.BlocklistType, elem map[string]string) []config_parser.BlocklistType{
	newElement := config_parser.BlocklistType{ Behavior: elem["behavior"], Duration: elem["duration"], Delay: elem["delay"], TimeDetected: elem["timeDetected"] }
	if elem["property"] != "" {
		newElement.Property = elem["property"]
	}
	if elem["ip"] != "" {
		newElement.Ip = elem["ip"]
	} else if elem["session"] != "" {
		newElement.Session = elem["session"]
	} else if elem["userAgent"] != "" {
		newElement.Useragent = elem["userAgent"]
	}
	return append(blocklist, newElement)
}