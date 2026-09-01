# Denison UTR Capture — Safari Web Extension (local dev)

Browser helper for Today Beta UTR results import. Replaces the HTTPS→HTTP console snippet (mixed-content blocked by Safari).

## Architecture

```
Safari toolbar action
  → background.js (extension context)
      → content/utr-page.js on app.utrsports.net (fetch UTR API with page session)
      → POST tennis JSON only → http://localhost:3000/api/recruiting/today-beta/utr-capture
```

- **No JWT/cookie extraction** — content script calls the UTR API with `credentials: "include"`; only JSON match data is forwarded.
- **No mixed content** — localhost requests originate from the extension background worker, not the UTR page.
- **Isaac Lewis only** (UTR `3186547`) until the live Safari test passes.

## One-time Xcode setup

Requires **Xcode** (not Command Line Tools alone) and **Safari 17+**.

### 1. Create the Safari Web Extension project

1. Open **Xcode** → **File → New → Project**
2. Choose **macOS → App**
3. Product Name: `DenisonUtrCapture`
4. Interface: **SwiftUI**, Language: **Swift**
5. Save inside:
   ```
   browser-extensions/denison-utr-capture/macos/
   ```
   (Replace the placeholder Swift files if Xcode creates duplicates — use the ones already in `DenisonUtrCapture/`.)

6. **File → New → Target → Safari Web Extension**
7. Name: `DenisonUtrCapture Extension`
8. Activate the scheme when prompted.

### 2. Replace generated extension files

From the repo root:

```bash
chmod +x macos/sync-utr-extension-resources.sh
./macos/sync-utr-extension-resources.sh
```

In Xcode, for the **DenisonUtrCapture Extension** target:

1. Delete auto-generated `SafariWebExtensionHandler.swift` **only if** you will add the repo version:
   - Use `macos/DenisonUtrCapture Extension/SafariWebExtensionHandler.swift`
2. Ensure **Resources** contains the synced `manifest.json`, `background.js`, `content/`, `icons/`, `lib/`.
3. Build Settings → **Other Linker Flags**: none required for v0.1.

Re-run `./macos/sync-utr-extension-resources.sh` whenever extension JavaScript changes.

### 3. Build and install locally

1. Select the **DenisonUtrCapture** scheme (macOS app, not extension alone).
2. **Product → Run** (⌘R).
3. When the app launches, Safari prompts to enable the extension — click **Turn On** (or open **Safari → Settings → Extensions**).
4. Enable **Denison UTR Capture** for `app.utrsports.net`.
5. Pin the toolbar button if desired.

For unsigned local builds: **Safari → Settings → Advanced → Show features for web developers → Allow unsigned extensions** (wording may vary by macOS version).

## Daily use — Isaac live test

1. Start Denison OS: `npm run dev` (sign in via Safari at http://localhost:3000).
2. Open **Recruiting → Today Beta** — confirm **Browser Helper: Installed**.
3. Click **Open UTR Results** for Isaac Lewis (or open https://app.utrsports.net/profiles/3186547?t=2 while logged into UTR).
4. Click **Send Results to Denison OS** in the Safari toolbar.
5. Read the notification summary, then refresh Today Beta.

### Expected success (Isaac, existing TRN baseline)

- UTR matches read > 0
- Most match existing TRN rows (cross-source matched)
- 0 new results (if nothing new on UTR)
- Isaac → **Checked Today**
- UTR ratings enriched on matched rows

Failed captures **do not** mark checked today.

## Permissions (manifest)

| Permission | Purpose |
|------------|---------|
| `https://app.utrsports.net/*` | UTR profile/results pages + content script |
| `https://api.utrsports.net/*` | Structured results fetch (session cookies) |
| `http://localhost:3000/*` | Denison OS API + Today Beta install detection |
| `activeTab` | Toolbar action on current UTR tab |
| `notifications` | Capture success/failure summary |

No browsing history, `<all_urls>`, or broad host access.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Not logged into UTR | Sign in at app.utrsports.net |
| Wrong UTR profile | v0.1 allows Isaac (`3186547`) only |
| Denison unavailable | `npm run dev` not running |
| Denison not signed in | Sign in at localhost:3000 in **Safari** |
| Content script missing | Reload UTR tab after enabling extension |
| Browser Helper: Not detected | Extension disabled or Today Beta not open in Safari |

## Files

| Path | Role |
|------|------|
| `extension/manifest.json` | Web extension manifest (MV3) |
| `extension/background.js` | Orchestrates fetch + localhost POST |
| `extension/content/utr-page.js` | UTR API fetch in page context |
| `extension/content/denison-page.js` | Marks extension installed on Today Beta |
| `macos/DenisonUtrCapture/` | Minimal macOS wrapper app |
| `macos/DenisonUtrCapture Extension/` | Safari Web Extension target + Resources |
