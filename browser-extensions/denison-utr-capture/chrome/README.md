# Denison UTR Capture — Chrome (local testing)

Use this Chrome extension to send Isaac Lewis UTR results to Denison Tennis OS. No developer console, no Xcode, and no copy/paste snippets.

## Install (one time)

1. Open **Google Chrome**.
2. Go to: `chrome://extensions`
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Choose this folder:
   ```
   browser-extensions/denison-utr-capture/chrome
   ```
   (Inside your Denison Tennis OS project folder.)
6. Pin **Denison UTR Capture** to the Chrome toolbar (puzzle icon → pin).

## Before each capture session

7. Make sure Denison Tennis OS is running at **http://localhost:3000** (your usual dev server).
8. Sign in to **Denison Tennis OS** in Chrome.
9. Sign in to **UTR** in Chrome (app.utrsports.net).

## Capture Isaac Lewis results

10. Open Isaac's UTR Results page:  
    https://app.utrsports.net/profiles/3186547?t=2
11. Click **Denison UTR Capture** in the Chrome toolbar.
12. Read the success or error notification.
13. Return to **Recruiting → Today Beta** in Chrome and verify Isaac's status.

### What success looks like

```
Isaac Lewis · 12 matches read · 9 matched existing · 0 new · 0 needs review · Sent to Denison OS
```

Failed captures do **not** mark Isaac as checked today.

## Common problems

| Problem | What to do |
|---------|------------|
| Not logged into UTR | Sign in at app.utrsports.net, reload Isaac's Results page |
| Wrong profile | v0.1 only supports Isaac Lewis (UTR id 3186547) |
| Denison unavailable | Start the dev server (`npm run dev`) |
| Not signed into Denison | Open localhost:3000 in Chrome and sign in |
| Extension not working on UTR tab | Reload the UTR page after installing the extension |

## Privacy

The extension uses your normal UTR login. It sends **tennis match data only** to your local Denison app. It does not store or send passwords, JWTs, or cookies to Denison.

## Safari version

A Safari Web Extension is also available under `../macos/` for future use. Chrome is the recommended path for local testing today.
