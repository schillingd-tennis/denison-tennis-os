#!/bin/bash
# Sync web extension assets into the Safari Web Extension Resources folder.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/browser-extensions/denison-utr-capture/extension"
DEST="${ROOT}/browser-extensions/denison-utr-capture/macos/DenisonUtrCapture Extension/Resources"

if [[ ! -d "$SRC" ]]; then
  echo "Extension source not found: $SRC" >&2
  exit 1
fi

mkdir -p "$DEST"
rsync -a --delete \
  --exclude '.DS_Store' \
  "$SRC/" "$DEST/"

echo "Synced extension → $DEST"
