#!/bin/bash
# WhatsApp helper install notes (Mac). Prefer working --tick CLI first.
# Optional LaunchAgent can wrap --tick on a short interval (mirrors Apple Messages).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_SUPPORT="${HOME}/Library/Application Support/DenisonTennisOS/whatsapp"
mkdir -p "$APP_SUPPORT/auth"

echo "WhatsApp helper home: $APP_SUPPORT"
echo ""
echo "1. Install deps (once): npm install"
echo "2. Pair (once; do not reset auth under $APP_SUPPORT/auth):"
echo "     npm run whatsapp-helper -- --pair-code --phone +1XXXXXXXXXX"
echo "     # or: npm run whatsapp-helper -- --pair"
echo "3. Select ONE conversation + recruit (stores mapping for --tick):"
echo "     npm run whatsapp-helper -- --import-conversation <jid> --recruit <person_id>"
echo "     # First local import may target local Supabase; then enable live:"
echo "4. Enable live OS destination (sets production_activation_at=now once; keeps import_from_at):"
echo "     npm run whatsapp-helper -- --enable-live-destination"
echo "5. Keychain service role (prefer WhatsApp service; falls back to Apple Messages):"
echo "     security add-generic-password -s com.denison.tennis-os.whatsapp -a supabase-service-role -w '<service-role>'"
echo "6. Tick (claim queued jobs from hosted UI Sync WhatsApp):"
echo "     npm run whatsapp-helper -- --tick"
echo ""
echo "Optional LaunchAgent: schedule --tick every 1–2 minutes (same pattern as macos/install-apple-messages-helper.sh)."
echo "Session auth stays under $APP_SUPPORT/auth (gitignored). Never put service-role keys in whatsapp.json."
echo "Verified live host: hvctdzhxfpkyflbihvhv.supabase.co — do not use inactive ptclpxniippveqsrsfso."
