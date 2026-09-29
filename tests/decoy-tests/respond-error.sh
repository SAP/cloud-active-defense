#!/bin/bash
# Test: after a honeytoken alert fires, subsequent requests from the same
# user-agent receive an HTTP 500 error response (error behavior via global config).

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
TRIGGER_UA="test-respond-error-canary"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": {
    "configReload": 1,
    "respond": [{
      "source": "userAgent",
      "behavior": "error",
      "delay": "now",
      "duration": "10s"
    }]
  },
  "decoys": [
    {
      "decoy": { "key": "x-canary-error", "value": "1" },
      "detect": {
        "seek": { "inRequest": ".*", "in": "header" },
        "alert": { "severity": "HIGH", "whenSeen": true }
      }
    }
  ]
}
EOF

sleep 3

# Trigger: fire the alert and get this UA added to the blocklist
curl -s -A "$TRIGGER_UA" -H "x-canary-error: 1" "$PROXY/" > /dev/null
sleep 1

# Check: next request from the same UA should get HTTP 500
status=$(curl -s -o /dev/null -w "%{http_code}" -A "$TRIGGER_UA" "$PROXY/")

if [ "$status" = "500" ]; then
  pass "respond-error: blocked user-agent received HTTP 500 as expected"
else
  fail "respond-error: expected HTTP 500, got $status"
fi
