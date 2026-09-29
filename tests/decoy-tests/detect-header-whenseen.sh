#!/bin/bash
# Test: alert fires when a honeytoken appears in a request header (whenSeen)

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "x-debug-mode-canary", "value": "1" },
      "inject": {},
      "detect": {
        "seek": { "inRequest": ".*", "in": "header" },
        "alert": { "severity": "HIGH", "whenSeen": true }
      }
    }
  ]
}
EOF

sleep 3

curl -s -H "x-debug-mode-canary: 1" "$PROXY/" > /dev/null
sleep 1

proxy_logs=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
if echo "$proxy_logs" | grep -qF '"DecoyKey":"x-debug-mode-canary"'; then
  pass "detect-header-whenseen: alert fired when honeytoken header was sent"
else
  fail "detect-header-whenseen: no alert found in proxy logs"
fi
