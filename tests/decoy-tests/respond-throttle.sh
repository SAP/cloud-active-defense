#!/bin/bash
# Test: after a honeytoken alert fires, subsequent requests from the same
# user-agent are throttled (response delayed 10s, client times out at 5s).

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
TRIGGER_UA="test-respond-throttle-canary"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": {
    "configReload": 1,
    "respond": [{
      "source": "userAgent",
      "behavior": "throttle",
      "property": "10",
      "delay": "now",
      "duration": "15s"
    }]
  },
  "decoys": [
    {
      "decoy": { "key": "x-canary-throttle", "value": "1" },
      "detect": {
        "seek": { "inRequest": ".*", "in": "header" },
        "alert": { "severity": "HIGH", "whenSeen": true }
      }
    }
  ]
}
EOF

sleep 3

# Trigger: fire the alert and get this UA added to the throttlelist
curl -s -A "$TRIGGER_UA" -H "x-canary-throttle: 1" "$PROXY/" > /dev/null
sleep 1

# Check: next request from the same UA should be throttled (10s delay > 5s max-time)
curl --max-time 5 -s -A "$TRIGGER_UA" "$PROXY/" > /dev/null 2>&1
exit_code=$?

if [ "$exit_code" -eq 28 ]; then
  pass "respond-throttle: throttled user-agent response timed out as expected"
else
  fail "respond-throttle: expected curl timeout (exit 28), got exit $exit_code"
fi
