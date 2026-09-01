import { chromium, type BrowserContext } from "playwright";

import { PROFILE_DIR } from "./config.js";

let sharedContext: BrowserContext | null = null;
let contextHeadless: boolean | null = null;
let checkInProgress = false;

export function isAgentBusy(): boolean {
  return checkInProgress;
}

export function setAgentBusy(value: boolean): void {
  checkInProgress = value;
}

export async function getPersistentContext(options?: {
  headless?: boolean;
}): Promise<BrowserContext> {
  const headless = options?.headless ?? true;

  if (sharedContext && contextHeadless !== headless) {
    await closePersistentContext();
  }

  if (sharedContext) {
    return sharedContext;
  }

  sharedContext = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  });
  contextHeadless = headless;

  return sharedContext;
}

export async function closePersistentContext(): Promise<void> {
  if (sharedContext) {
    await sharedContext.close();
    sharedContext = null;
    contextHeadless = null;
  }
}
