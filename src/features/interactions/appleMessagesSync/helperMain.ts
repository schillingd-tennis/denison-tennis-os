/**
 * Compiled Apple Messages helper entry.
 *
 * --baseline records the local scan cursor (do not run against live Messages
 * in this phase). --tick runs the inactive helper loop. Tests inject a
 * TickRuntime; the live path is never used from tests.
 */
import { homedir } from "node:os";
import { join } from "node:path";

import { recordBaseline } from "./engine";
import { ProcessFileLock } from "./lock";
import { defaultAppleMessagesHome, syncLockPath } from "./paths";
import { openSyncStore } from "./store";
import { SqliteMessagesCatalog } from "./catalog";
import { runTick, type TickRuntime, type TickResult } from "./tick";
import { createLiveTickRuntime } from "./liveRuntime";
import { collectMatchDiagnostics, formatMatchDiagnostics } from "./matchDiagnostics";

function argValue(argv: string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value after ${flag}`);
  }
  return value;
}

function logTick(result: TickResult): void {
  console.log(
    `tick action=${result.action} imported=${result.importedCount} job=${result.jobId ?? "-"} error=${result.errorCode ?? "-"}`,
  );
}

export async function runHelper(argv: string[], injected?: TickRuntime): Promise<number> {
  const home = argValue(argv, "--home") ?? defaultAppleMessagesHome();

  if (argv.includes("--baseline")) {
    const chatDb = argValue(argv, "--chat-db") ?? join(homedir(), "Library/Messages/chat.db");
    const lock = new ProcessFileLock(syncLockPath(home));
    lock.acquire();
    const store = openSyncStore(home);
    try {
      const catalog = SqliteMessagesCatalog.open(chatDb);
      try {
        const result = recordBaseline(store, catalog);
        console.log(
          `Baseline recorded: ROWID=${result.baselineRowId} activation=${result.activationAt} imported=${result.importedCount}`,
        );
        return 0;
      } finally {
        catalog.close();
      }
    } finally {
      store.close();
      lock.release();
    }
  }


  if (argv.includes("--match-report")) {
    const store = openSyncStore(home);
    try {
      console.log(formatMatchDiagnostics(collectMatchDiagnostics(store)));
      return 0;
    } finally {
      store.close();
    }
  }

  if (argv.includes("--tick")) {
    if (injected) {
      const result = await runTick(injected);
      logTick(result);
      return result.action === "failed" || result.action === "rejected" ? 2 : 0;
    }
    const runtime = createLiveTickRuntime({
      home,
      now: new Date(),
      chatDb: argValue(argv, "--chat-db") ?? undefined,
    });
    try {
      const result = await runTick(runtime);
      logTick(result);
      return result.action === "failed" || result.action === "rejected" ? 2 : 0;
    } finally {
      runtime.store.close();
      const catalog = runtime.catalog as { close?: () => void };
      catalog.close?.();
    }
  }

  console.error("Usage: apple-messages-helper --home <dir> [--baseline|--tick|--match-report] [--chat-db <chat.db>]");
  return 1;
}

const invokedDirectly =
  typeof process.argv[1] === "string" &&
  (process.argv[1].includes("helperMain") || process.argv[1].includes("apple-messages-helper"));

if (invokedDirectly) {
  void runHelper(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    },
  );
}
