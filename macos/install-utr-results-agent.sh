#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(command -v node)"
LABEL="com.denison.tennis-os.utr-results-agent"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
HELPER_CONFIG="$HOME/Library/Application Support/DenisonTennisOS/apple-messages.json"

for file in .local/utr-agent-cert.pem .local/utr-agent-key.pem local-agents/utr-results-agent/node_modules/tsx/dist/cli.mjs; do
  if [[ ! -f "$REPO_ROOT/$file" ]]; then
    echo "Missing $file. Complete UTR agent dependency and HTTPS setup first." >&2
    exit 1
  fi
done

if [[ ! -f "$HELPER_CONFIG" ]]; then
  echo "Missing production helper config: $HELPER_CONFIG" >&2
  exit 1
fi

if ! security find-generic-password -s com.denison.tennis-os.whatsapp -a supabase-service-role >/dev/null 2>&1 \
  && ! security find-generic-password -s com.denison.tennis-os.apple-messages -a supabase-service-role >/dev/null 2>&1; then
  echo "Missing Supabase service-role credential in Keychain." >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$REPO_ROOT/.local/utr-agent-logs"
python3 - "$PLIST" "$REPO_ROOT" "$NODE_BIN" "$LABEL" <<'PY'
import os
import plistlib
import sys

path, root, node, label = sys.argv[1:]
payload = {
    "Label": label,
    "ProgramArguments": [
        node,
        root + "/local-agents/utr-results-agent/node_modules/tsx/dist/cli.mjs",
        root + "/local-agents/utr-results-agent/src/server.ts",
    ],
    "WorkingDirectory": root,
    "RunAtLoad": True,
    "KeepAlive": True,
    "ProcessType": "Background",
    "ThrottleInterval": 30,
    "EnvironmentVariables": {
        "UTR_BACKGROUND_ENABLED": "true",
        "TSX_TSCONFIG_PATH": root + "/tsconfig.json",
        "PATH": os.path.dirname(node) + ":/opt/homebrew/bin:/usr/bin:/bin",
    },
    "StandardOutPath": root + "/.local/utr-agent-logs/service.stdout.log",
    "StandardErrorPath": root + "/.local/utr-agent-logs/service.stderr.log",
}
with open(path, "wb") as file:
    plistlib.dump(payload, file)
os.chmod(path, 0o644)
PY

plutil -lint "$PLIST" >/dev/null
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/$LABEL"

echo "Installed $LABEL. It starts at login, restarts after exit, and runs the daily UTR worker."
echo "Logs: $REPO_ROOT/.local/utr-agent-logs/service.stdout.log"
