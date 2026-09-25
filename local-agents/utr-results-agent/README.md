# UTR Results Agent (Local)

This small program runs on your Mac and checks UTR match results for configured Rank Board recruits using your normal UTR login in a saved browser session.

Denison Tennis OS sends check requests to this agent. The agent reads UTR in the browser and returns match data. Denison OS imports results into Today Beta.

## First Time Setup

1. Open Terminal in the Denison Tennis OS project folder.
2. Install agent dependencies:
   ```bash
   cd local-agents/utr-results-agent
   npm install
   npx playwright install chromium
   cd ../..
   ```
3. Start Denison Tennis OS (your usual `npm run dev`).
4. Start the UTR Results Agent (leave this Terminal window open):
   ```bash
   npm run utr:agent
   ```
5. Run UTR Login once:
   ```bash
   npm run utr:login
   ```
6. A Chromium window opens. Log into UTR normally (same as you would in a browser).
7. When finished, close the browser window or press Enter in Terminal.
8. Open **Recruiting → Today Beta** in Denison OS.
9. Confirm **Agent: Online** under **UTR Automatic Check**.
10. Click **Check Isaac Only**.

## Normal Use

1. Start Denison Tennis OS.
2. Start the UTR Results Agent (`npm run utr:agent`).
3. Open Today Beta.
4. Click **Check 5 Recruits** (after Isaac live test passes and five-player check is enabled).

## If UTR Login Expires

1. Run:
   ```bash
   npm run utr:login
   ```
2. Log into UTR in the browser window.
3. Close the window and retry the check in Today Beta.

## Visible Isaac Diagnostic (temporary)

If Isaac checks fail with a generic error, run one visible diagnostic:

1. Stop the agent if it is running (Ctrl+C in the agent Terminal).
2. Start the agent with debug browser enabled:
   ```bash
   UTR_AGENT_DEBUG_BROWSER=true npm run utr:agent
   ```
3. In Today Beta, click **Check Isaac Only**.
4. Watch the Chromium window — it should show Isaac's UTR Results page while the check runs.
5. Read the safe diagnostic summary printed in the agent Terminal.
6. Full details are also written to `.local/utr-agent-logs/runs.jsonl`.

Turn off debug mode by restarting the agent without `UTR_AGENT_DEBUG_BROWSER`.

## Where Login Is Stored

Your UTR session is saved locally in:

`.local/utr-browser-profile/`

This folder stays on your Mac only. Denison OS does not store your UTR password.

A local shared secret for localhost requests is in:

`.local/utr-agent-secret`

Run logs are in:

`.local/utr-agent-logs/`

## Notes

- The agent listens on `https://localhost:4317` (this Mac only, loopback-bound).
- One-time HTTPS setup: `npm run utr:https-setup` (requires [mkcert](https://github.com/FiloSottile/mkcert): `brew install mkcert`).
- Start the agent: `npm run utr:agent` (fails with a setup hint if certificates are missing).
- Checks run one recruit at a time — no scheduling yet.
- TRN manual import remains available as fallback.

## Start automatically at Mac login

Run `bash macos/install-utr-results-agent.sh` from the repository root, after HTTPS setup.
This installs a per-user LaunchAgent with automatic restart. It preserves the existing
UTR browser profile and secret. Stop a manually started agent before installing, so
port 4317 is available. Service logs are in `.local/utr-agent-logs/service.*.log`.

The installed service checks once per Eastern calendar day after 7:00 a.m. and also
accepts a manual queue request from Today Beta. If the Mac is asleep or offline at
7:00 a.m., the check starts after it wakes and reconnects. The Mac must be logged in,
and UTR may still require you to renew the saved browser login.

The outbound worker requires production migration `0070_tennis_data_acquisition.sql`.
That migration provides the shared UTR/TRN/WTN job queue, provider heartbeats, leases,
progress, and safe errors. UTR is the first active adapter; TRN and WTN remain explicitly
not configured until their authorized acquisition methods are connected.
