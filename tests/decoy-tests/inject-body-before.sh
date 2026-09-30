#!/bin/bash
# Test: inject text before a regex match in the response body

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "CANARY_BEFORE", "string": "<!-- CANARY_BEFORE -->" },
      "inject": {
        "store": {
          "inResponse": ".*",
          "withVerb": "GET",
          "as": "body",
          "at": { "method": "before", "property": "</body>" }
        }
      },
      "detect": {}
    }
  ]
}
EOF

sleep 3

body=$(curl -s "$PROXY/")
if echo "$body" | grep -q "<!-- CANARY_BEFORE -->"; then
  pass "inject-body-before: injected string found before </body>"
else
  fail "inject-body-before: injected string not found in response body"
fi
