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

/* **** */
