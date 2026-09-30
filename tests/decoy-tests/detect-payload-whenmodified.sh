#!/bin/bash
# Test: inject a hidden field in form response; alert when it is POSTed with a modified value

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "system_canary", "separator": "=", "value": "2" },
      "inject": {
        "store": {
          "inResponse": "/login$",
          "withVerb": "GET",
          "as": "body",
          "at": { "method": "before", "property": "</form>" }
        }
      },
      "detect": {
        "seek": { "inRequest": ".*", "withVerb": "POST", "in": "payload" },
        "alert": { "severity": "CRITICAL", "whenModified": true }
      }
    }
  ]
}
EOF

sleep 3

curl -s -X POST -d "system_canary=99&username=test" "$PROXY/login" > /dev/null
sleep 1

proxy_logs=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
if echo "$proxy_logs" | grep -qF '"DecoyKey":"system_canary"'; then
  pass "detect-payload-whenmodified: alert fired when hidden field was submitted with modified value"
else
  fail "detect-payload-whenmodified: no alert found in proxy logs"
fi
