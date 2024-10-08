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
	bl := findSourcePriority(blocklist, session, headers["user-agent"], strings.Split(string(sourceIP), ":")[0])
	if bl != config_parser.EmptyBlocklist() {
		return behaviorAction(bl), bl.Property
	}
	return "continue", ""
}

func IsThrottled(throttleList []config_parser.BlocklistType, headers, cookies map[string]string, config config_parser.AlertConfig) string {
	session, _ := detect.FindSession(map[string]map[string]string{"header": headers, "cookie": cookies, "payload": { "payload": "" }}, nil, config)
	sourceIP, err := proxywasm.GetProperty([]string{"source", "address"})
    if (err != nil) {
      fmt.Errorf("failed to fetch property: %v", err)
    }
	
	th := findSourcePriority(throttleList, session, headers["user-agent"], strings.Split(string(sourceIP), ":")[0])
	if !isTimeout(th){
		return "continue"
	}
	if th != config_parser.EmptyBlocklist() {
		if th.Property == "" {
			return "30-120"
		}
		return th.Property
	}
	
	return ""
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
			proxywasm.LogErrorf("{\"type\": \"system\", \"content\": \"error when blocking blocklisted user: %s\"}", err)
		}
		return "pause"
	} else if bl.Behavior == "clone" || bl.Behavior == "exhaust" {
		return bl.Behavior
	}
	return "continue"
}

func isTimeout(bl config_parser.BlocklistType) bool {
	if bl.Delay == "" || bl.Delay == "now" {
		return true
	}
	date, err := strconv.ParseInt(bl.Time, 10, 64)
	if err != nil {
		proxywasm.LogErrorf("{\"type\": \"system\", \"content\": \"error parsing blocklist element '%s' when parsing time: %s\"}", bl, err)
	}
	parsedDate := time.Unix(date, 0)	
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

func AppendBlocklist(blocklist []config_parser.BlocklistType, elements []map[string]string) []config_parser.BlocklistType{
	for _, elem := range elements {
		newElement := config_parser.BlocklistType{ Behavior: elem["Behavior"], Duration: elem["Duration"], Delay: elem["Delay"], Time: elem["Time"] }
		if elem["Property"] != "" {
			newElement.Property = elem["Property"]
		}
		if elem["SourceIp"] != "" {
			newElement.SourceIp = elem["SourceIp"]
		}
		if elem["Session"] != "" {
			newElement.Session = elem["Session"]
		}
		if elem["UserAgent"] != "" {
			newElement.Useragent = elem["UserAgent"]
		}
		blocklist = append(blocklist, newElement)
	}
	return blocklist
}

func findSourcePriority(blocklist []config_parser.BlocklistType, session, userAgent, ip string) config_parser.BlocklistType{
	if len(blocklist) == 0 {
		return config_parser.BlocklistType{}
	}
	var highestBlock config_parser.BlocklistType
	var highestPriority int = 99
	if userAgent == "" {
		userAgent = "empty"
	}
	for _, block := range blocklist {
		if (session != "" && block.Session == session) && (ip != "" && block.SourceIp == ip) && (userAgent != "" && block.Useragent == userAgent){
			return block
		} else if (session != "" && block.Session == session) && (ip != "" && block.SourceIp == ip){
			if highestPriority > 1 {
				highestPriority = 1
				highestBlock = block
			}
		} else if (session != "" && block.Session == session) && (userAgent != "" && block.Useragent == userAgent){
			if highestPriority > 2 {
				highestPriority = 2
				highestBlock = block
			}
		} else if (session != "" && block.Session == session) {
			if highestPriority > 3 {
				highestPriority = 3
				highestBlock = block
			}
		} else if (ip != "" && block.SourceIp == ip) && (userAgent != "" && block.Useragent == userAgent) {
			if highestPriority > 4 {
				highestPriority = 4
				highestBlock = block
			}
		} else if (ip != "" && block.SourceIp == ip){
			if highestPriority > 5 {
				highestPriority = 5
				highestBlock = block
			}
		} else if (userAgent != "" && block.Useragent == userAgent) {
			if highestPriority > 6 {
				highestPriority = 6
				highestBlock = block
			}
		}
	}
	return highestBlock
}

func checkSource(blocklist config_parser.BlocklistType, userAgent string, session string, ip string) bool {
	if blocklist.SourceIp != "" && blocklist.Session != "" && blocklist.Useragent != "" {
		if blocklist.SourceIp == ip && blocklist.Session == session && blocklist.Useragent == userAgent {
			return true
		} else {
			return false
		}
	} else if blocklist.SourceIp != "" && blocklist.Session != "" {
		if blocklist.SourceIp == ip && blocklist.Session == session {
			return true
		} else {
			return false
		}
	} else if blocklist.SourceIp != "" && blocklist.Useragent != "" {
		if blocklist.SourceIp == ip && blocklist.Useragent == userAgent  {
			return true
		} else {
			return false
		}
	} else if blocklist.Session != "" && blocklist.Useragent != "" {
		if blocklist.Session == session && blocklist.Useragent == userAgent {
			return true
		} else {
			return false
		}
	} else if (blocklist.SourceIp != "" && blocklist.SourceIp == ip) || (blocklist.Useragent != "" && blocklist.Useragent == userAgent) || (blocklist.Session != "" && blocklist.Session == session) {
		return true
	}
	return false
}