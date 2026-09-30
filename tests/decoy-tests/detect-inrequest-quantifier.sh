#!/bin/bash
# Test: bounded quantifiers {N,M} in regex patterns are rejected at config-load
# time (no WASM crash, no silent failure).  A config containing {N,M} must be
# treated as invalid — the proxy must keep its previous config and log an error —
# and a corrected config without {N,M} must work normally.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

# --- step 1: push a config that contains {N,M} and verify it is rejected ---
cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "x-canary-quantifier", "value": "1" },
      "detect": {
        "seek": {
          "inRequest": "/api/[a-z]{2,64}",
          "in": "header"
        },
        "alert": { "severity": "HIGH", "whenSeen": true }
      }
    }
  ]
}
EOF

sleep 3

# The proxy must remain responsive (no crash/OOM)
code=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$PROXY/")
if [ "$code" = "000" ]; then
  fail "detect-inrequest-quantifier: proxy crashed or hung after loading {N,M} config"
fi
pass "detect-inrequest-quantifier: proxy still responsive after {N,M} config (status $code)"

# The proxy must have logged a validation error for the bounded quantifier
logs=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
if echo "$logs" | grep -qE "bounded quantifier|config is invalid"; then
  pass "detect-inrequest-quantifier: proxy rejected config with {N,M} pattern"
else
  fail "detect-inrequest-quantifier: proxy did not log rejection of {N,M} pattern"
fi

# The decoy header must NOT trigger an alert (rejected config means no active decoy)
curl -s -H "x-canary-quantifier: 1" "$PROXY/api/search" > /dev/null
sleep 1
logs2=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
alert_count=$(echo "$logs2" | grep -c '"DecoyKey":"x-canary-quantifier"' || true)
if [ "$alert_count" -gt 0 ]; then
  fail "detect-inrequest-quantifier: alert fired from rejected {N,M} config — decoy should have been refused"
fi
pass "detect-inrequest-quantifier: no alert from rejected {N,M} config"

# --- step 2: push a corrected config (no quantifier) and verify it works ---
cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "x-canary-quantifier", "value": "1" },
      "detect": {
        "seek": {
          "inRequest": "/api/[a-z]+",
          "in": "header"
        },
        "alert": { "severity": "HIGH", "whenSeen": true }
      }
    }
  ]
}
EOF

sleep 3

curl -s -H "x-canary-quantifier: 1" "$PROXY/api/search" > /dev/null
sleep 1
logs3=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
if echo "$logs3" | grep -qF '"DecoyKey":"x-canary-quantifier"'; then
  pass "detect-inrequest-quantifier: alert fired correctly with corrected [a-z]+ pattern"
else
  fail "detect-inrequest-quantifier: no alert with corrected [a-z]+ pattern"
fi
