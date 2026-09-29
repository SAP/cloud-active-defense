#!/bin/bash
# Test: inject a cookie in response; alert when that cookie is re-sent with a modified value

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "role_canary", "separator": "=", "value": "user" },
      "inject": {
        "store": {
          "inResponse": ".*",
          "withVerb": "GET",
          "as": "cookie"
        }
      },
      "detect": {
        "seek": { "inRequest": ".*", "in": "cookie" },
        "alert": { "severity": "CRITICAL", "whenModified": true }
      }
    }
  ]
}
EOF

sleep 3

curl -s -H "Cookie: role_canary=admin" "$PROXY/" > /dev/null
sleep 1

proxy_logs=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
if echo "$proxy_logs" | grep -qF '"DecoyKey":"role_canary"'; then
  pass "detect-cookie-whenmodified: alert fired when honeytoken cookie was modified"
else
  fail "detect-cookie-whenmodified: no alert found in proxy logs"
fi
