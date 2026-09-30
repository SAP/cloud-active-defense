#!/bin/bash
# Test: after a honeytoken alert fires, subsequent requests from the same
# user-agent are dropped (connection hangs until client timeout).

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
TRIGGER_UA="test-respond-drop-canary"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "x-canary-drop", "value": "1" },
      "detect": {
        "seek": { "inRequest": ".*", "in": "header" },
        "alert": { "severity": "HIGH", "whenSeen": true },
        "respond": [{
          "source": "userAgent",
          "behavior": "drop",
          "delay": "now",
          "duration": "10s"
        }]
      }
    }
  ]
}
EOF

sleep 3

# Trigger: fire the alert and get this UA added to the blocklist
curl -s -A "$TRIGGER_UA" -H "x-canary-drop: 1" "$PROXY/" > /dev/null
sleep 1

# Check: a plain request from the same UA should now hang (drop behavior)
tempfile=$(mktemp)
curl --max-time 5 -s -A "$TRIGGER_UA" "$PROXY/" > "$tempfile" 2>&1
exit_code=$?

rm -f "$tempfile"

if [ "$exit_code" -eq 28 ]; then
  pass "respond-drop: request from blocked user-agent timed out as expected"
else
  fail "respond-drop: expected curl timeout (exit 28), got exit $exit_code"
fi
