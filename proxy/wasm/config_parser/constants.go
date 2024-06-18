package config_parser

/* enum types */
type HttpVerb string
const (
	GET     HttpVerb = "GET"
	HEAD             = "HEAD"
	POST             = "POST"
	PUT              = "PUT"
	DELETE           = "DELETE"
	CONNECT          = "CONNECT"
	OPTIONS          = "OPTIONS"
	TRACE            = "TRACE"
	PATCH            = "PATCH"
	ALL              = "ALL"
)

type StoreAs string
const (
	cookie_as StoreAs = "cookie"
	header_as         = "header"
	body_as           = "body"
	status_as		  =	"status"
)

type InjectMethod string
const (
	END       InjectMethod = "END"
	line                   = "line"
	character              = "character"
	before                 = "before"
	after                  = "after"
	replace                = "replace"
	always                 = "always"
)

type InRequest string
const (
	cookie     InRequest = "cookie"
	header               = "header"
	url                  = "url"
	getParam             = "getParam"
	postParam           = "postParam"
	payload              = "payload"
)

type Severity string
const (
	HIGH   Severity = "HIGH"
	MEDIUM          = "MEDIUM"
	LOW             = "LOW"
)

type InSession string
const (
	cookie_inS InSession = "cookie"
	header_inS 			 = "header"
)

type InUsername string
const (
	cookie_inU InUsername = "cookie"
	header_inU 			  = "header"
	payload_inU 		  = "payload"
)

type Source string
const (
	ip					 = "ip"
	user_agent			 = "userAgent"
	session				 = "session"
)

type Behavior string
const (
	drop	Behavior = "drop"	
	server_error			 = "error"
	divert			 = "divert"
	throttle		 = "throttle"
)

/* **** */
