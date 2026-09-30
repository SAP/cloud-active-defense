#!/bin/bash
# Clones neowriter into tests/neowriter/ for integration testing.
# Safe to re-run: skips clone if the directory already exists.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/neowriter"

if [ -d "$TARGET/.git" ]; then
  echo "neowriter already cloned at $TARGET — pulling latest..."
  git -C "$TARGET" pull --ff-only
else
  echo "Cloning neowriter into $TARGET..."
  git clone https://github.com/valvolt/neowriter.git "$TARGET"
fi

echo "neowriter ready at $TARGET"
