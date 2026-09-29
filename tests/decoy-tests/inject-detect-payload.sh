#!/bin/bash
# Test: a hidden decoy field is injected into a login form, and an alert fires
# when a client submits that field — verifying the end-to-end inject+detect flow.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": {
        "key": "system",
        "separator": "=",
        "value": "2",
        "string": "<input type=\"hidden\" name=\"system\" value=\"2\">"
      },
      "inject": {
        "store": {
          "inResponse": "/login$",
          "withVerb": "GET",
          "as": "body",
          "at": { "method": "line", "property": "5" }
        }
      },
      "detect": {
        "seek": {
          "inRequest": "/login$",
          "withVerb": "POST",
          "in": "payload"
        },
        "alert": { "severity": "HIGH", "whenSeen": true }
      }
    }
  ]
}
EOF

sleep 3

# Step 1: verify the hidden field is injected into the login page
body=$(curl -s "$PROXY/login")
if echo "$body" | grep -qF '<input type="hidden" name="system" value="2">'; then
  pass "inject-detect-payload (inject): hidden decoy field present in /login body"
else
  fail "inject-detect-payload (inject): hidden decoy field not found in /login body"
fi

# Step 2: submit the injected field and verify an alert fires
curl -s -X POST -d "system=2" "$PROXY/login" > /dev/null
sleep 1

proxy_logs=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
if echo "$proxy_logs" | grep -qF '"DecoyKey":"system"'; then
  pass "inject-detect-payload (detect): alert fired when injected field was submitted"
else
  fail "inject-detect-payload (detect): no alert found after submitting injected field"
fi
