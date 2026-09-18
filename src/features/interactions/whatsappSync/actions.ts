"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isManualWhatsAppSyncAvailable } from "./environment";
import { defaultWhatsAppHome } from "./paths";
import {
  emptyWhatsAppStatus,
  formatWhatsAppStatus,
  type WhatsAppUiStatus,
} from "./settingsStatus";
import { openWhatsAppSyncStore } from "./store";

async function requireSignedIn(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sign in to manage WhatsApp sync." };
    return { ok: true };
  } catch {
    return { ok: false, error: "WhatsApp sync is unavailable." };
  }
}

export async function getWhatsAppSyncStatusAction(): Promise<
  { ok: true; status: WhatsAppUiStatus } | { ok: false; error: string }
> {
  const auth = await requireSignedIn();
  if (!auth.ok) return auth;
  // Hosted/production: never touch Mac Application Support / local sqlite.
  if (!isManualWhatsAppSyncAvailable()) {
    return { ok: true, status: emptyWhatsAppStatus() };
  }
  try {
    const store = openWhatsAppSyncStore(defaultWhatsAppHome());
    try {
      const state = store.readState();
      const unmatched = store.listUnmatched();
      return { ok: true, status: formatWhatsAppStatus(state, unmatched.length) };
    } finally {
      store.close();
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "WhatsApp sync status unavailable.",
    };
  }
}

/**
 * Manual sync for WhatsApp queues a helper reminder — the Mac helper performs import.
 * Returns current status plus whether local sync is allowed.
 */
export async function queueWhatsAppSyncAction(): Promise<
  { ok: true; status: WhatsAppUiStatus; hint: string } | { ok: false; error: string }
> {
  const auth = await requireSignedIn();
  if (!auth.ok) return auth;
  if (!isManualWhatsAppSyncAvailable()) {
    return {
      ok: false,
      error: "WhatsApp sync is available only against local development Supabase.",
    };
  }
  const status = await getWhatsAppSyncStatusAction();
  if (!status.ok) return status;
  if (status.status.connectionState === "disconnected" || status.status.connectionState === "logged_out") {
    return {
      ok: false,
      error:
        "WhatsApp helper is not connected. Run: npm run whatsapp-helper -- --pair-code --phone +1… (or --pair for QR)",
    };
  }
  if (!status.status.importFromAt) {
    return {
      ok: true,
      status: status.status,
      hint: "Enable forward-only sync in Settings (sets “Start importing from”) before importing.",
    };
  }
  if (!status.status.selectedConversationId) {
    return {
      ok: true,
      status: status.status,
      hint: "Connected. Select one conversation: npm run whatsapp-helper -- --import-conversation <jid> --recruit <id>",
    };
  }
  return {
    ok: true,
    status: status.status,
    hint: "Run the Mac helper tick/import for the selected conversation to pull new messages after the cutoff.",
  };
}

/** Enable forward-only import; sets “Start importing from” to now if not already set. */
export async function enableWhatsAppForwardOnlyAction(): Promise<
  { ok: true; status: WhatsAppUiStatus } | { ok: false; error: string }
> {
  const auth = await requireSignedIn();
  if (!auth.ok) return auth;
  if (!isManualWhatsAppSyncAvailable()) {
    return {
      ok: false,
      error: "WhatsApp sync is available only against local development Supabase.",
    };
  }
  try {
    const store = openWhatsAppSyncStore(defaultWhatsAppHome());
    try {
      store.enableForwardOnlyImport(new Date());
      const state = store.readState();
      const unmatched = store.listUnmatched();
      return { ok: true, status: formatWhatsAppStatus(state, unmatched.length) };
    } finally {
      store.close();
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not enable forward-only sync.",
    };
  }
}

export async function getEmptyWhatsAppStatusAction(): Promise<WhatsAppUiStatus> {
  return emptyWhatsAppStatus();
}
