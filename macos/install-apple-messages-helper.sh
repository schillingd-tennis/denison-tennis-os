#!/bin/bash
# Install the Apple Messages helper LaunchAgent.
# Do not run this script from tests or Phase 3 implementation.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
HELPER_JS="${ROOT}/helpers/apple-messages-sync/appleMessagesSync/helperMain.js"
APP_SUPPORT="${HOME}/Library/Application Support/DenisonTennisOS"
LOG_DIR="${HOME}/Library/Logs"
LABEL="com.denison.tennis-os.apple-messages-sync"
TEMPLATE="${ROOT}/macos/${LABEL}.plist.template"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"

case "$NODE_BIN" in
  /*) ;;
  *) echo "NODE_BIN must be an absolute path (got: $NODE_BIN)" >&2; exit 1 ;;
esac
if [[ "$NODE_BIN" == *npx* || "$HELPER_JS" == *npx* ]]; then
  echo "LaunchAgent must not use npx" >&2
  exit 1
fi

mkdir -p "$APP_SUPPORT" "$LOG_DIR" "$(dirname "$PLIST")"
sed \
  -e "s|__NODE_BIN__|$NODE_BIN|g" \
  -e "s|__HELPER_JS__|$HELPER_JS|g" \
  -e "s|__APP_SUPPORT__|$APP_SUPPORT|g" \
  -e "s|__LOG_OUT__|$LOG_DIR/apple-messages-sync.out.log|g" \
  -e "s|__LOG_ERR__|$LOG_DIR/apple-messages-sync.err.log|g" \
  "$TEMPLATE" > "$PLIST"

launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL"
