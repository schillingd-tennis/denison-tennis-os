/**
 * Live Mac helper wiring for WhatsApp → production (or local) destination.
 * Tests must not call createLiveTickRuntime — it reads Keychain and talks to Baileys.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ProcessFileLock } from "../appleMessagesSync/lock";
import { createProductionRecruitCatalog } from "../appleMessagesSync/recruits";
import {
  assertLiveDestinationUrl,
  assertLocalDevSupabaseUrlForHelper,
  helperModeFromUrl,
  readWhatsAppHelperConfigFile,
  supabaseHostFromUrl,
} from "./config";
import { destinationKeyFromUrl } from "./destination";
import { createJobQueue, DEFAULT_LEASE_MS } from "./jobQueue";
import { createSupabaseJobStore } from "./jobQueueSupabase";
import { defaultWhatsAppHome, helperConfigPath, syncLockPath } from "./paths";
import { createSupabasePresenceStore } from "./presence";
import { createKeychainSecretStore, defaultSecurityRunner } from "./secrets";
import { openWhatsAppSyncStore } from "./store";
import type { TickRuntime } from "./tick";
import { createRecruitingInteractionsWhatsAppWriter } from "./writer";

export type LiveTickOptions = {
  home: string;
  now?: Date;
};

/** Public URL from whatsapp.json; service role from Keychain (WhatsApp → Apple fallback). */
export function createDestinationSupabaseClient(home: string): SupabaseClient {
  const config = readWhatsAppHelperConfigFile(helperConfigPath(home));
  const mode = helperModeFromUrl(config.supabaseUrl);
  if (mode === "live") {
    assertLiveDestinationUrl(config.supabaseUrl);
  } else {
    assertLocalDevSupabaseUrlForHelper(config.supabaseUrl);
  }

  const secrets = createKeychainSecretStore(defaultSecurityRunner);
  let serviceRole = secrets.readServiceRole();
  if (!serviceRole && mode === "local") {
    serviceRole =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SECRET_KEY?.trim() ||
      "";
  }
  if (!serviceRole) {
    throw new Error("keychain_unavailable");
  }
  return createClient(config.supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createLiveTickRuntime(options: LiveTickOptions): TickRuntime {
  const home = options.home;
  const config = readWhatsAppHelperConfigFile(helperConfigPath(home));
  const mode = helperModeFromUrl(config.supabaseUrl);
  if (mode === "live") {
    assertLiveDestinationUrl(config.supabaseUrl);
  } else {
    assertLocalDevSupabaseUrlForHelper(config.supabaseUrl);
  }
  const client = createDestinationSupabaseClient(home);
  const secrets = createKeychainSecretStore(defaultSecurityRunner);
  const destinationKey = destinationKeyFromUrl(config.supabaseUrl);
  return {
    now: options.now ?? new Date(),
    home,
    lock: new ProcessFileLock(syncLockPath(home)),
    store: openWhatsAppSyncStore(home),
    queue: createJobQueue(createSupabaseJobStore(client as never)),
    secrets,
    presence: createSupabasePresenceStore(client as never),
    writer: createRecruitingInteractionsWhatsAppWriter(client as never),
    recruits: createProductionRecruitCatalog(client as never, {
      contacts: new Map(),
      overrides: {},
    }),
    supabaseUrl: config.supabaseUrl,
    destinationKey,
    destinationHost: supabaseHostFromUrl(config.supabaseUrl),
    mode,
    leaseMs: DEFAULT_LEASE_MS,
  };
}

export function defaultLiveHome(): string {
  return defaultWhatsAppHome();
}
