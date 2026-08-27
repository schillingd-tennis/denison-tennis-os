/**
 * Live Mac helper wiring. Tests must not call createLiveTickRuntime.
 * It would read Keychain, copy Messages, and talk to production.
 */
import { homedir } from "node:os";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { SqliteMessagesCatalog } from "./catalog";
import { readHelperConfigFile, assertProductionSupabaseUrl } from "./config";
import { createJobQueue, DEFAULT_LEASE_MS } from "./jobQueue";
import { createSupabaseJobStore } from "./jobQueueSupabase";
import { ProcessFileLock } from "./lock";
import { copyChatDatabase } from "./messagesCopy";
import { helperConfigPath, syncLockPath } from "./paths";
import { loadHandleOverrides, loadMacContacts } from "./localMatchSources";
import { createProductionRecruitCatalog } from "./recruits";
import { createKeychainSecretStore, defaultSecurityRunner } from "./secrets";
import { openSyncStore } from "./store";
import type { TickRuntime } from "./tick";
import { createRecruitingInteractionsWriter } from "./writer";

export type LiveTickOptions = {
  home: string;
  now?: Date;
  chatDb?: string;
};

export function createLiveTickRuntime(options: LiveTickOptions): TickRuntime {
  const home = options.home;
  const config = readHelperConfigFile(helperConfigPath(home));
  assertProductionSupabaseUrl(config.supabaseUrl);
  const secrets = createKeychainSecretStore(defaultSecurityRunner);
  const serviceRole = secrets.readServiceRole();
  if (!serviceRole) {
    throw new Error("keychain_unavailable");
  }
  const client = createClient(config.supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const copyDir = join(home, "chat-copy");
  const copied = copyChatDatabase(
    options.chatDb ?? join(homedir(), "Library/Messages/chat.db"),
    copyDir,
  );
  return {
    now: options.now ?? new Date(),
    home,
    lock: new ProcessFileLock(syncLockPath(home)),
    store: openSyncStore(home),
    catalog: SqliteMessagesCatalog.open(copied),
    queue: createJobQueue(createSupabaseJobStore(client as never)),
    secrets,
    writer: createRecruitingInteractionsWriter(client as never),
    recruits: createProductionRecruitCatalog(client as never, {
      contacts: loadMacContacts(join(home, "contacts-copy")),
      overrides: loadHandleOverrides(home),
    }),
    supabaseUrl: config.supabaseUrl,
    leaseMs: DEFAULT_LEASE_MS,
  };
}
