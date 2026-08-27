/**
 * Compiled Apple Messages helper entry.
 *
 * --baseline records the local scan cursor (do not run against live Messages
 * in this phase). --tick runs the inactive helper loop. Tests inject a
 * TickRuntime; the live path is never used from tests.
 */
import { mkdtempSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { recordBaseline } from "./engine";
import { ProcessFileLock } from "./lock";
import { defaultAppleMessagesHome, syncLockPath } from "./paths";
import { openSyncStore } from "./store";
import { SqliteMessagesCatalog } from "./catalog";
import { runTick, type TickRuntime, type TickResult } from "./tick";
import { createLiveTickRuntime } from "./liveRuntime";
import { collectMatchDiagnostics, formatMatchDiagnostics } from "./matchDiagnostics";
import { copyChatDatabase } from "./messagesCopy";
import {
  fetchCurrentTeamPersonIds,
  fetchPlaceholderAppleInteractions,
  formatPlaceholderInventory,
  formatRepairCounts,
  hasRepairEmptyBodiesFlag,
  parseRepairFlags,
  placeholderNotesInventory,
  planBodyRepair,
} from "./repairEmptyBodies";
import {
  parseDotEnv,
  productionCredentialsFromEnv,
} from "../appleMessages";

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

  if (hasRepairEmptyBodiesFlag(argv)) {
    const flags = parseRepairFlags(argv);
    if (flags.applyProduction) {
      throw new Error("Refusing to apply production body repair in this run. Dry-run only.");
    }
    let productionRead = false;
    let teamRead = false;
    let localCopy = false;
    let rows: Awaited<ReturnType<typeof fetchPlaceholderAppleInteractions>> = [];
    let currentTeamPersonIds = new Set<string>();
    try {
      const envFile = readFileSync(
        [".env.production.local", ".env.local"]
          .map((file) => join(process.cwd(), file))
          .find((file) => {
            try {
              readFileSync(file, "utf8");
              return true;
            } catch {
              return false;
            }
          }) ?? join(process.cwd(), ".env.production.local"),
        "utf8",
      );
      const credentials = productionCredentialsFromEnv(parseDotEnv(envFile));
      rows = await fetchPlaceholderAppleInteractions(credentials);
      productionRead = true;
      try {
        currentTeamPersonIds = await fetchCurrentTeamPersonIds(credentials);
        teamRead = true;
      } catch {
        teamRead = false;
      }
    } catch {
      productionRead = false;
    }
    const localByGuid = new Map();
    try {
      const copyDir = mkdtempSync(join(tmpdir(), "apple-messages-repair-"));
      const copied = copyChatDatabase(
        argValue(argv, "--chat-db") ?? join(homedir(), "Library/Messages/chat.db"),
        copyDir,
      );
      const catalog = SqliteMessagesCatalog.open(copied);
      try {
        for (const row of rows) {
          const guid = row.sourceKey?.trim();
          if (!guid) continue;
          const local = catalog.messageByGuid(guid);
          if (local) localByGuid.set(guid, local);
        }
        localCopy = true;
      } finally {
        catalog.close();
      }
    } catch {
      localCopy = false;
    }
    const { counts } = planBodyRepair(rows, localByGuid, currentTeamPersonIds);
    console.log(formatPlaceholderInventory(placeholderNotesInventory(rows)));
    console.log(formatRepairCounts(counts, false));
    console.log(
      `repair production_read=${productionRead} team_read=${teamRead} local_copy=${localCopy} applied=false`,
    );
    return 0;
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

  console.error("Usage: apple-messages-helper --home <dir> [--baseline|--tick|--match-report|--repair-empty-bodies] [--chat-db <chat.db>]");
  return 1;
}

const invokedDirectly =
  typeof process.argv[1] === "string" && process.argv[1].includes("helperMain");

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
