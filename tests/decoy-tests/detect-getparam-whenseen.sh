#!/bin/bash
# Test: alert fires when a decoy key appears as a GET query parameter (whenSeen)

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "debug_canary", "value": "true" },
      "inject": {},
      "detect": {
        "seek": { "inRequest": ".*", "withVerb": "GET", "in": "getParam" },
        "alert": { "severity": "HIGH", "whenSeen": true }
      }
    }
  ]
}
EOF

sleep 3

curl -s "$PROXY/?debug_canary=true" > /dev/null
sleep 1

if docker compose -f "$COMPOSE_FILE" logs proxy --since 10s 2>&1 | grep -q '"DecoyKey":"debug_canary"'; then
  pass "detect-getparam-whenseen: alert fired when decoy key appeared in GET query string"
else
  fail "detect-getparam-whenseen: no alert found in proxy logs"
fi
