#!/bin/bash
# Test: inject a Set-Cookie into all GET responses

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "canary", "separator": "=", "value": "1" },
      "inject": { "store": { "inResponse": ".*", "withVerb": "GET", "as": "cookie" } },
      "detect": {}
    }
  ]
}
EOF

sleep 3

response=$(curl -s -D - -o /dev/null "$PROXY/")
if echo "$response" | grep -qi "set-cookie: canary=1"; then
  pass "inject-response-cookie: Set-Cookie canary=1 present"
else
  fail "inject-response-cookie: Set-Cookie canary=1 not found in response headers"
fi
