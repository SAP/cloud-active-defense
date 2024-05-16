package config_parser

import (
	"strconv"
	"strings"

	"github.com/valyala/fastjson"
)

func ParseString(confString []byte) (error, *Config) {
	p := newParser(confString)

	err := p.jsonToStruct(p.ConfigFile)
	if err != nil {
		return err, nil
	}

	validator := newValidator()
	err = validator.Validate(p.Config)
	if err != nil {
		return err, nil
	}
	// p.Config.Print()

	return nil, p.Config
}

type Parser struct {
	Config     *Config
	ConfigFile []byte
}

func newParser(confContent []byte) *Parser {
	return &Parser{
		Config:     &Config{Decoys: DecoyConfig{}, Config: ConfigType{}},
		ConfigFile: confContent,
	}
}

/* func (p *Parser) readFile() (error, []byte) {
	confContent, err := os.ReadFile(*p.ConfigFile)
	if err != nil {
		return err, nil
	}
	return nil, confContent
}
*/

func (p *Parser) jsonToStruct(content []byte) error {
	var fjsP fastjson.Parser
	json, err := fjsP.Parse(string(content))
	if err != nil {
		return err
	}
	if json.Exists("config") {
		p.Config.Config = ConfigType{
			Alert: AlertConfig{
				Session: SessionType{
					Key: string(json.GetStringBytes("config", "alert", "session", "key")),
					In: string(json.GetStringBytes("config", "alert", "session", "in")),
					Separator: string(json.GetStringBytes("config", "alert", "session", "separator")),
				},
				Username: UsernameType{
					In: string(json.GetStringBytes("config", "alert", "username", "in")),
					Value: string(json.GetStringBytes("config", "alert", "username", "value")),
					Key: string(json.GetStringBytes("config", "alert", "username", "key")),
				},
			}, 
			Server: string(json.GetStringBytes("config", "server")),
			Respond: RespondType{
				Source: string(json.GetStringBytes("config", "respond", "source")),
				Behavior: string(json.GetStringBytes("config", "respond", "behavior")),
				Delay: string(json.GetStringBytes("config", "respond", "delay")),
				Duration: string(json.GetStringBytes("config", "respond", "duration")),
				Property: string(json.GetStringBytes("config", "respond", "property")),
			},
			BlocklistReload: int(json.GetInt("config", "blocklistReload")),
		}
	}
	filtersJs := json.GetArray("decoy", "filters")
	for _, filterJs := range filtersJs {
		filter := p.filterJsonToStruct(filterJs)
		p.Config.Decoys.Filters = append(p.Config.Decoys.Filters, *filter)
	}
	return nil
}

func (p *Parser) filterJsonToStruct(filterJs *fastjson.Value) *FilterType {
	return &FilterType{
		Decoy: DecoyType{
      Key:          p.getString(filterJs, "decoy", "key"),
      DynamicKey:   p.getString(filterJs, "decoy", "dynamicKey"),
      Separator:    p.getString(filterJs, "decoy", "separator"),
			Value:        p.getString(filterJs, "decoy", "value"),
			DynamicValue: p.getString(filterJs, "decoy", "dynamicValue"),
			String:       p.getString(filterJs, "decoy", "string"),
		},
		Inject: InjectType{
			Store: StoreType{
				InResponse: p.getString(filterJs, "inject", "store", "inResponse"),
				InRequest:  p.getString(filterJs, "inject", "store", "inRequest"),
				WithVerb:   p.getString(filterJs, "inject", "store", "withVerb"),
				As:         p.getString(filterJs, "inject", "store", "as"),
				At: AtType{
					Method:   p.getString(filterJs, "inject", "store", "at", "method"),
					Property: p.getString(filterJs, "inject", "store", "at", "property"),
				},
			},
			WhenTrue: p.conditionsJsonToStruct(
				filterJs.Get("inject").Get("store").GetArray("whenTrue"),
			),
			WhenFalse: p.conditionsJsonToStruct(
				filterJs.Get("inject").Get("store").GetArray("whenFalse"),
			),
		},
		Detect: DetectType{
			Seek: SeekType{
				InRequest:  p.getString(filterJs, "detect", "seek", "inRequest"),
				InResponse: p.getString(filterJs, "detect", "seek", "inResponse"),
				WithVerb:   p.getString(filterJs, "detect", "seek", "withVerb"),
				In:         p.getString(filterJs, "detect", "seek", "in"),
			},
			Alert: AlertType{
				Severity:     p.getString(filterJs, "detect", "alert", "severity"),
				WhenSeen:     filterJs.Get("detect").Get("alert").GetBool("whenSeen"),
				WhenComplete: filterJs.Get("detect").Get("alert").GetBool("whenComplete"),
				WhenModified: filterJs.Get("detect").Get("alert").GetBool("whenModified"),
				WhenAbsent:   filterJs.Get("detect").Get("alert").GetBool("whenAbsent"),
			},
			Respond: RespondType{
				Source: p.getString(filterJs, "detect", "respond", "source"),
				Behavior:p. getString(filterJs, "detect", "respond", "behavior"),
				Delay: p.getString(filterJs, "detect", "respond", "delay"),
				Duration: p.getString(filterJs, "detect", "respond", "duration"),
				Property: p.getString(filterJs, "detect", "respond", "property"),
			},
		},
	}
}

func BlacklistJsonToStruct(content []byte) (error, []BlacklistType) {
	blacklist := []BlacklistType{}
	var fjsp fastjson.Parser
	json, err := fjsp.Parse(string(content))
	if err != nil {
		return err, nil
	}
	list := json.GetArray("list")
	for _, elem := range list {
		bl := BlacklistType{
			Ip:          	string(elem.GetStringBytes("ip")),
			Session: 		string(elem.GetStringBytes("session")),
			Useragent: 		string(elem.GetStringBytes("userAgent")),
			Behavior:   	string(elem.GetStringBytes("behavior")),
			Delay:			string(elem.GetStringBytes("delay")),
			Duration:     	string(elem.GetStringBytes("duration")),
			Property: 		string(elem.GetStringBytes("property")),
			TimeDetected: 	string(elem.GetStringBytes("timeDetected")),
		}
		blacklist = append(blacklist, bl)
	}
	return nil, blacklist
}

func (p *Parser) conditionsJsonToStruct(conditionsJs []*fastjson.Value) []ConditionType {
	var conditions []ConditionType
	for _, conditionJs := range conditionsJs {
		conditions = append(conditions, ConditionType{
			Key:   p.getString(conditionJs, "key"),
			Value: p.getString(conditionJs, "value"),
			In:    p.getString(conditionJs, "in"),
		})
	}
	return conditions
}

func (p *Parser) getString(v *fastjson.Value, keys ...string) string {
	for _, key := range keys {
		v = v.Get(key)
	}
	if v == nil {
		return ""
	}
	out := v.MarshalTo([]byte(""))
	out = out[1 : len(out)-1]
  outs := string(out)
  outs = unescapeNewlines(outs)
	outs = strings.ReplaceAll(outs, "\\\"", "\"")
	outs, _ = strconv.Unquote(`"` + outs + `"`)
  return outs
}

func unescapeNewlines(str string) string {
  newline := strings.Index(str, "\n") 
  for newline != -1 {
    str = str[:newline] + "\n" + str[newline:]
    newline = strings.Index(str, "\n") 
  }
  return str
}
