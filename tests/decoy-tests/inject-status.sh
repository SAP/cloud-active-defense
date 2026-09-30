#!/bin/bash
# Test: inject a custom HTTP status code on a specific path

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "418" },
      "inject": {
        "store": {
          "inResponse": "/teapot$",
          "as": "status"
        }
      },
      "detect": {}
    }
  ]
}
EOF

sleep 3

status=$(curl -o /dev/null -s -w "%{http_code}" "$PROXY/teapot")
if [ "$status" = "418" ]; then
  pass "inject-status: status code 418 returned for /teapot"
else
  fail "inject-status: expected 418, got $status"
fi
