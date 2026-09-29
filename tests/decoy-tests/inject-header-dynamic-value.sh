#!/bin/bash
# Test: inject a response header whose value is generated from a regex pattern.
# Verifies goregen handles the pattern correctly and the proxy stays responsive.
# Also verifies that a pattern with {N,M} is rejected (no crash) while a
# valid pattern like [a-f0-9]{12} (written as [a-f0-9][a-f0-9]...) works.
# Since {N,M} is unsupported, we use a fixed-length pattern with repetition.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

# --- step 1: verify {N,M} in dynamicValue is rejected without crashing ---
cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": {
        "key": "x-trace-id",
        "dynamicValue": "[a-f0-9]{16,32}"
      },
      "inject": {
        "store": {
          "inResponse": ".*",
          "as": "header"
        }
      },
      "detect": {}
    }
  ]
}
EOF

sleep 3

code=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$PROXY/")
if [ "$code" = "000" ]; then
  fail "inject-header-dynamic-value: proxy crashed after {N,M} dynamicValue config"
fi
pass "inject-header-dynamic-value: proxy responsive after {N,M} config rejected (status $code)"

logs=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
if echo "$logs" | grep -qE "bounded quantifier|config is invalid"; then
  pass "inject-header-dynamic-value: proxy rejected {N,M} dynamicValue pattern"
else
  fail "inject-header-dynamic-value: proxy did not reject {N,M} dynamicValue pattern"
fi

# --- step 2: valid pattern (16 hex chars, no quantifier) works ---
# [a-f0-9] repeated 16 times produces a 16-char lowercase hex string
cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": {
        "key": "x-trace-id",
        "dynamicValue": "[a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9]"
      },
      "inject": {
        "store": {
          "inResponse": ".*",
          "as": "header"
        }
      },
      "detect": {}
    }
  ]
}
EOF

sleep 3

value=$(curl -s -D - -o /dev/null "$PROXY/" | grep -i "^x-trace-id:" | tr -d '\r\n' | sed 's/^[^:]*: //')

if [ -z "$value" ]; then
  fail "inject-header-dynamic-value: x-trace-id header absent from response"
fi
pass "inject-header-dynamic-value: x-trace-id present: '$value'"

if ! echo "$value" | grep -qE '^[a-f0-9]+$'; then
  fail "inject-header-dynamic-value: value '$value' contains non-hex characters"
fi
pass "inject-header-dynamic-value: value matches [a-f0-9]+"

# Verify the proxy remains responsive (no OOM from goregen)
code2=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$PROXY/")
if [ "$code2" != "200" ]; then
  fail "inject-header-dynamic-value: proxy unresponsive after inject (status $code2)"
fi
pass "inject-header-dynamic-value: proxy still responsive after dynamic inject"
