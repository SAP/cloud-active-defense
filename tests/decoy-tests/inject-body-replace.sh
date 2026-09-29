#!/bin/bash
# Test: replace the first regex match in the response body

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "CANARY_REPLACE", "string": "HELLO <!-- CANARY_REPLACE -->" },
      "inject": {
        "store": {
          "inResponse": ".*",
          "withVerb": "GET",
          "as": "body",
          "at": { "method": "replace", "property": "Login" }
        }
      },
      "detect": {}
    }
  ]
}
EOF

sleep 3

body=$(curl -s "$PROXY/")
if echo "$body" | grep -q "<!-- CANARY_REPLACE -->"; then
  pass "inject-body-replace: replacement string found in response body"
else
  fail "inject-body-replace: replacement string not found in response body"
fi
