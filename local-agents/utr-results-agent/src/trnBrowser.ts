import { join } from "node:path";
import { lstat, readlink, unlink } from "node:fs/promises";

import { chromium, type BrowserContext } from "playwright";

import { REPO_ROOT } from "./config.js";

export const TRN_PROFILE_DIR = join(
  REPO_ROOT,
  process.env.UTR_AGENT_LOCAL_SUPABASE_URL
    ? ".local/trn-browser-profile-local"
    : ".local/trn-browser-profile",
);

let context: BrowserContext | null = null;

const CHROME_SINGLETON_FILES = ["SingletonLock", "SingletonCookie", "SingletonSocket"] as const;

async function processExists(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function clearStaleChromeSingletonFiles(): Promise<void> {
  const lockPath = join(TRN_PROFILE_DIR, "SingletonLock");
  let ownerPid: number | null = null;
  try {
    const stat = await lstat(lockPath);
    if (stat.isSymbolicLink()) {
      const target = await readlink(lockPath);
      const match = target.match(/-(\d+)$/);
      ownerPid = match ? Number(match[1]) : null;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return;
  }

  if (ownerPid && await processExists(ownerPid)) {
    throw new Error(
      `TRN browser profile is already in use by Chrome process ${ownerPid}. Close the dedicated TRN Chrome window and try again.`,
    );
  }

  await Promise.all(CHROME_SINGLETON_FILES.map(async (name) => {
    await unlink(join(TRN_PROFILE_DIR, name)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }));
}

export async function getTrnContext(): Promise<BrowserContext> {
  if (context) return context;
  await clearStaleChromeSingletonFiles();
  const options = {
    channel: "chrome",
    // TRN's Cloudflare challenge rejects headless Chromium even when the saved
    // profile has a valid authenticated session. Use real Chrome without the
    // automation banner and keep its background window off-screen.
    ignoreDefaultArgs: ["--use-mock-keychain", "--enable-automation"],
    headless: false,
    args: ["--window-position=-10000,-10000", "--window-size=1440,1000"],
    viewport: { width: 1440, height: 1000 },
  } as const;
  try {
    context = await chromium.launchPersistentContext(TRN_PROFILE_DIR, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/ProcessSingleton|profile.*already in use/i.test(message)) throw error;
    // Chrome can leave singleton files behind after a crash. Re-evaluate them
    // after the failed launch and retry once when their owner is gone.
    await clearStaleChromeSingletonFiles();
    context = await chromium.launchPersistentContext(TRN_PROFILE_DIR, options);
  }
  return context;
}

export async function closeTrnContext(): Promise<void> {
  if (!context) return;
  const current = context;
  context = null;
  await current.close().catch(() => undefined);
}
