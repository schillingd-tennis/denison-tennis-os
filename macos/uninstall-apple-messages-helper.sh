#!/bin/bash
# Uninstall the Apple Messages helper LaunchAgent.
# Do not run this script from tests or Phase 3 implementation.
set -euo pipefail

LABEL="com.denison.tennis-os.apple-messages-sync"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
rm -f "$PLIST"
echo "Uninstalled $LABEL"
