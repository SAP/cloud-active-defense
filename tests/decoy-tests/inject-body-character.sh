#!/bin/bash
# Test: inject text at character index 0 in the response body (prepend)

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "CANARY_CHAR", "string": "<!-- CANARY_CHAR -->" },
      "inject": {
        "store": {
          "inResponse": ".*",
          "withVerb": "GET",
          "as": "body",
          "at": { "method": "character", "property": "0" }
        }
      },
      "detect": {}
    }
  ]
}
EOF

sleep 3

body=$(curl -s "$PROXY/")
if echo "$body" | grep -q "<!-- CANARY_CHAR -->"; then
  pass "inject-body-character: injected string found in response body"
else
  fail "inject-body-character: injected string not found in response body"
fi
