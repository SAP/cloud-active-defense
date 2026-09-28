#!/bin/bash
# Test: alert fires when a URL is visited that does NOT contain an expected token (whenAbsent)

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "x-api-token-absent-test" },
      "inject": {},
      "detect": {
        "seek": { "inRequest": ".*", "withVerb": "GET", "in": "url" },
        "alert": { "severity": "MEDIUM", "whenAbsent": "x-api-token-absent-test" }
      }
    }
  ]
}
EOF

sleep 3

curl -s "$PROXY/" > /dev/null
sleep 1

if docker compose -f "$COMPOSE_FILE" logs proxy --since 10s 2>&1 | grep -q '"DecoyKey":"x-api-token-absent-test"'; then
  pass "detect-url-whenabsent: alert fired when expected token was absent from URL"
else
  fail "detect-url-whenabsent: no alert found in proxy logs"
fi
