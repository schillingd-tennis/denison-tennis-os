#!/bin/bash
# Documented CLI installer notes for the WhatsApp helper (Mac-local).
# V1 prefers explicit CLI over LaunchAgent; optional LaunchAgent can wrap --pair/--status.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_SUPPORT="${HOME}/Library/Application Support/DenisonTennisOS/whatsapp"
mkdir -p "$APP_SUPPORT/auth"

echo "WhatsApp helper home: $APP_SUPPORT"
echo ""
echo "1. Install deps (once): npm install"
echo "2. Init local config:"
echo "     npm run whatsapp-helper -- --init-config"
echo "3a. Pair via QR (terminal ASCII — pause for phone scan):"
echo "     npm run whatsapp-helper -- --pair"
echo "3b. Or pair via 8-digit code (if QR says Can't link / rate-limited):"
echo "     npm run whatsapp-helper -- --pair-code --phone +1XXXXXXXXXX"
echo "     Then on phone: Linked Devices → Link a Device → Link with phone number instead"
echo "4. After pairing:"
echo "     npm run whatsapp-helper -- --status"
echo "     npm run whatsapp-helper -- --list-chats"
echo "     npm run whatsapp-helper -- --import-conversation <jid> --recruit <person_id>"
echo ""
echo "Session auth stays under $APP_SUPPORT/auth (gitignored)."
echo "Writes only to local Supabase (127.0.0.1 / localhost). Production *.supabase.co is refused."
