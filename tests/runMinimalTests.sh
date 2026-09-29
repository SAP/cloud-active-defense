#!/bin/bash
# Runs all decoy pattern tests against the minimal CAD stack.
# Requires: docker compose v2, curl
#
# Usage (from project root):   ./tests/runMinimalTests.sh
# Usage (from tests/):         ./runMinimalTests.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export COMPOSE_FILE="docker-compose.minimal-test.yaml"
PROXY="http://localhost:8000"

echo "=== Starting minimal CAD test stack ==="
docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

# Seed a minimal valid config so the WASM plugin logs "read new config" on first poll.
# An empty decoys array has the same checksum as the plugin's initial state and won't trigger the log.
cat > test-decoys.json << 'EOF'
{"config":{"configReload":1},"decoys":[{"decoy":{"key":"_init_"},"inject":{},"detect":{}}]}
EOF

docker compose -f "$COMPOSE_FILE" up -d --build

echo "Waiting for proxy to become reachable..."
for i in $(seq 1 30); do
  if curl -sf "$PROXY/" > /dev/null 2>&1; then
    echo "Proxy is up."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: proxy did not become reachable after 60 seconds."
    docker compose -f "$COMPOSE_FILE" logs proxy
    docker compose -f "$COMPOSE_FILE" down
    exit 1
  fi
  sleep 2
done

echo "Waiting for WASM plugin to load initial config..."
for i in $(seq 1 20); do
  if docker compose -f "$COMPOSE_FILE" logs proxy 2>&1 | grep -q "read new config"; then
    echo "WASM config loaded."
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "ERROR: WASM plugin did not load config within 40 seconds."
    docker compose -f "$COMPOSE_FILE" logs proxy
    docker compose -f "$COMPOSE_FILE" down
    exit 1
  fi
  sleep 2
done

echo ""
echo "=== Running decoy tests ==="
passed=0
failed=0

for test in decoy-tests/*.sh; do
  echo ""
  echo "--- $test ---"
  if bash "$test"; then
    ((++passed))
  else
    ((++failed))
  fi
done

echo ""
echo "=== Results: $passed passed, $failed failed ==="

docker compose -f "$COMPOSE_FILE" down

if [ "$failed" -gt 0 ]; then
  exit 1
fi
