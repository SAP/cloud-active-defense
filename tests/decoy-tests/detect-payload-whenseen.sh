#!/bin/bash
# Test: alert fires when a honeytoken appears in a POST request body (payload, whenSeen)

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "debug_token_canary", "value": "xyzSecret" },
      "inject": {},
      "detect": {
        "seek": { "inRequest": ".*", "withVerb": "POST", "in": "payload" },
        "alert": { "severity": "HIGH", "whenSeen": true }
      }
    }
  ]
}
EOF

sleep 3

curl -s -X POST -d "debug_token_canary=xyzSecret&other=value" "$PROXY/" > /dev/null
sleep 1

if docker compose -f "$COMPOSE_FILE" logs proxy --since 10s 2>&1 | grep -q '"DecoyKey":"debug_token_canary"'; then
  pass "detect-payload-whenseen: alert fired when honeytoken found in POST body"
else
  fail "detect-payload-whenseen: no alert found in proxy logs"
fi
