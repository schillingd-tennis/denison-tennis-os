import { join } from "node:path";

import { chromium, type BrowserContext } from "playwright";

import { REPO_ROOT } from "./config.js";

export const WTN_PROFILE_DIR = join(REPO_ROOT, ".local/wtn-browser-profile");

let context: BrowserContext | null = null;

export async function getWtnContext(): Promise<BrowserContext> {
  if (context) return context;
  context = await chromium.launchPersistentContext(WTN_PROFILE_DIR, {
    headless: true,
    viewport: { width: 1440, height: 1000 },
  });
  return context;
}

export async function closeWtnContext(): Promise<void> {
  if (!context) return;
  const current = context;
  context = null;
  await current.close().catch(() => undefined);
}
