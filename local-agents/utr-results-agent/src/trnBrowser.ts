import { join } from "node:path";

import { chromium, type BrowserContext } from "playwright";

import { REPO_ROOT } from "./config.js";

export const TRN_PROFILE_DIR = join(REPO_ROOT, ".local/trn-browser-profile");

let context: BrowserContext | null = null;

export async function getTrnContext(): Promise<BrowserContext> {
  if (context) return context;
  context = await chromium.launchPersistentContext(TRN_PROFILE_DIR, {
    headless: true,
    viewport: { width: 1440, height: 1000 },
  });
  return context;
}

export async function closeTrnContext(): Promise<void> {
  if (!context) return;
  const current = context;
  context = null;
  await current.close().catch(() => undefined);
}
