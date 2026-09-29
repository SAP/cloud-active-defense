#!/bin/bash
# Test: alert fires when a specific key appears in the request URL (whenSeen)

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.minimal-test.yaml}"
PROXY="http://localhost:8000"
pass() { echo -e "\033[0;32mPASS\033[0m $1"; }
fail() { echo -e "\033[0;31mFAIL\033[0m $1"; exit 1; }

cat > ./test-decoys.json << 'EOF'
{
  "config": { "configReload": 1 },
  "decoys": [
    {
      "decoy": { "key": "/secret-url-test" },
      "inject": {},
      "detect": {
        "seek": { "inRequest": "/secret-url-test", "withVerb": "GET", "in": "url" },
        "alert": { "severity": "HIGH", "whenSeen": true }
      }
    }
  ]
}
EOF

sleep 3

curl -s "$PROXY/secret-url-test" > /dev/null
sleep 1

proxy_logs=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
if echo "$proxy_logs" | grep -qF '"DecoyKey":"/secret-url-test"'; then
  pass "detect-url-whenseen: alert fired for /secret-url-test in URL"
else
  fail "detect-url-whenseen: no alert found in proxy logs for /secret-url-test"
fi
