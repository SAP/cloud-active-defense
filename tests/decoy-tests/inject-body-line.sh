#!/bin/bash
# Test: inject text before line 5 of the login page response body

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "CANARY_LINE", "string": "<!-- CANARY_LINE -->" },
      "inject": {
        "store": {
          "inResponse": "/login$",
          "withVerb": "GET",
          "as": "body",
          "at": { "method": "line", "property": "5" }
        }
      },
      "detect": {}
    }
  ]
}
EOF

sleep 3

body=$(curl -s "$PROXY/login")
if echo "$body" | grep -q "<!-- CANARY_LINE -->"; then
  pass "inject-body-line: injected string found in /login response body"
else
  fail "inject-body-line: injected string not found in /login response body"
fi
