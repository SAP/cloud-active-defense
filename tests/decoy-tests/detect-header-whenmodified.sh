#!/bin/bash
# Test: inject a header in response; alert if that header is re-sent with a modified value

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "x-role-canary", "separator": ":", "value": "user" },
      "inject": {
        "store": {
          "inResponse": ".*",
          "withVerb": "GET",
          "as": "header"
        }
      },
      "detect": {
        "seek": { "inRequest": ".*", "in": "header" },
        "alert": { "severity": "CRITICAL", "whenModified": true }
      }
    }
  ]
}
EOF

sleep 3

curl -s -H "x-role-canary: admin" "$PROXY/" > /dev/null
sleep 1

proxy_logs=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
if echo "$proxy_logs" | grep -qF '"DecoyKey":"x-role-canary"'; then
  pass "detect-header-whenmodified: alert fired when honeytoken header was sent with modified value"
else
  fail "detect-header-whenmodified: no alert found in proxy logs"
fi
