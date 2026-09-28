#!/bin/bash
# Test: inject a custom header into all GET responses

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "x-canary", "value": "injected" },
      "inject": { "store": { "inResponse": ".*", "withVerb": "GET", "as": "header" } },
      "detect": {}
    }
  ]
}
EOF

sleep 3

response=$(curl -sI "$PROXY/")
if echo "$response" | grep -qi "x-canary: injected"; then
  pass "inject-response-header: x-canary header present"
else
  fail "inject-response-header: x-canary header not found in response headers"
fi
