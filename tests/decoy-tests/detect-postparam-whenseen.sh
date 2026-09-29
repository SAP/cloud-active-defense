#!/bin/bash
# Test: alert fires when a decoy key appears in a POST form parameter (whenSeen)

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "admin_override_canary", "separator": "=", "value": "true" },
      "inject": {},
      "detect": {
        "seek": { "inRequest": ".*", "withVerb": "POST", "in": "postParam" },
        "alert": { "severity": "HIGH", "whenSeen": true }
      }
    }
  ]
}
EOF

sleep 3

curl -s -X POST -d "admin_override_canary=true&user=test" "$PROXY/" > /dev/null
sleep 1

proxy_logs=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
if echo "$proxy_logs" | grep -qF '"DecoyKey":"admin_override_canary"'; then
  pass "detect-postparam-whenseen: alert fired when decoy key found in POST form param"
else
  fail "detect-postparam-whenseen: no alert found in proxy logs"
fi
