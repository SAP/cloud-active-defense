#!/bin/bash
# Test: replace all occurrences of a regex match in the response body

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "CANARY_ALWAYS", "string": "<!-- CANARY_ALWAYS -->" },
      "inject": {
        "store": {
          "inResponse": "/login$",
          "withVerb": "GET",
          "as": "body",
          "at": { "method": "always", "property": "type=\"text\"" }
        }
      },
      "detect": {}
    }
  ]
}
EOF

sleep 3

body=$(curl -s "$PROXY/login")
count=$(echo "$body" | grep -c "<!-- CANARY_ALWAYS -->" || true)
if [ "$count" -ge 1 ]; then
  pass "inject-body-always: injected string found ($count occurrences) in /login body"
else
  fail "inject-body-always: injected string not found in /login body"
fi
