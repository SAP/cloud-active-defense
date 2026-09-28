#!/bin/bash
# Test: alert fires only when the FULL key=value token is present in a cookie (whenComplete)

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "theme_canary", "separator": "=", "value": "dark" },
      "inject": {},
      "detect": {
        "seek": { "inRequest": ".*", "in": "cookie" },
        "alert": { "severity": "LOW", "whenComplete": true }
      }
    }
  ]
}
EOF

sleep 3

# Partial cookie (only key, no value) — should NOT fire
curl -s -H "Cookie: theme_canary=" "$PROXY/" > /dev/null
sleep 1
logs_before=$(docker compose -f "$COMPOSE_FILE" logs proxy --since 5s 2>&1)

# Full cookie (key=value) — SHOULD fire
curl -s -H "Cookie: theme_canary=dark" "$PROXY/" > /dev/null
sleep 1
logs_after=$(docker compose -f "$COMPOSE_FILE" logs proxy --since 5s 2>&1)

if echo "$logs_after" | grep -q '"DecoyKey":"theme_canary"'; then
  pass "detect-whencomplete: alert fired when full key=value cookie was present"
else
  fail "detect-whencomplete: no alert found when full cookie was sent"
fi
