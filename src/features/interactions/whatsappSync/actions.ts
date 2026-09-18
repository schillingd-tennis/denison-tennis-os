"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  isLocalWhatsAppMacStatusAvailable,
  isManualWhatsAppSyncAvailable,
} from "./environment";
import {
  JobQueueError,
  createJobQueue,
  enqueueManualForUser,
  readStatusForUser,
} from "./jobQueue";
import { createSupabaseJobStore } from "./jobQueueSupabase";
import { defaultWhatsAppHome } from "./paths";
import { createSupabasePresenceStore } from "./presence";
import {
  emptyWhatsAppStatus,
  formatHostedWhatsAppStatus,
  formatWhatsAppStatus,
  type WhatsAppUiStatus,
} from "./settingsStatus";
import { openWhatsAppSyncStore } from "./store";

async function requireUser(): Promise<
  { ok: true; userId: string; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> } | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sign in to manage WhatsApp sync." };
    return { ok: true, userId: user.id, supabase };
  } catch {
    return { ok: false, error: "WhatsApp sync is unavailable." };
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof JobQueueError) return error.message;
  if (error instanceof Error) return error.message;
  return "WhatsApp sync is unavailable.";
}

/**
 * Hosted/production: jobs + presence from Supabase user client only — never Mac paths.
 * Local: Mac Application Support sqlite when the app points at local Supabase.
 */
export async function getWhatsAppSyncStatusAction(): Promise<
  { ok: true; status: WhatsAppUiStatus } | { ok: false; error: string }
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  if (isManualWhatsAppSyncAvailable()) {
    try {
      const queue = createJobQueue(createSupabaseJobStore(auth.supabase));
      const presence = createSupabasePresenceStore(auth.supabase);
      const [jobs, presenceRow] = await Promise.all([
        readStatusForUser(queue, auth.userId),
        presence.readPresence(),
      ]);
      return {
        ok: true,
        status: formatHostedWhatsAppStatus({ presence: presenceRow, jobs }),
      };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  if (isLocalWhatsAppMacStatusAvailable()) {
    try {
      const store = openWhatsAppSyncStore(defaultWhatsAppHome());
      try {
        const state = store.readState();
        const unmatched = store.listUnmatched();
        return {
          ok: true,
          status: formatWhatsAppStatus(state, unmatched.length, {
            destinationHost: "local",
            helperOnline: state.connectionState === "connected",
          }),
        };
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

  return { ok: true, status: emptyWhatsAppStatus() };
}

export async function queueWhatsAppSyncAction(): Promise<
  { ok: true; status: WhatsAppUiStatus; hint: string } | { ok: false; error: string }
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  if (isManualWhatsAppSyncAvailable()) {
    try {
      const queue = createJobQueue(createSupabaseJobStore(auth.supabase));
      const result = await enqueueManualForUser(queue, auth.userId);
      const presence = createSupabasePresenceStore(auth.supabase);
      const [jobs, presenceRow] = await Promise.all([
        readStatusForUser(queue, auth.userId),
        presence.readPresence(),
      ]);
      const status = formatHostedWhatsAppStatus({ presence: presenceRow, jobs });
      return {
        ok: true,
        status,
        hint: result.created
          ? "WhatsApp sync queued. The Mac helper will claim it on the next --tick."
          : "A WhatsApp sync is already queued or running.",
      };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  if (!isLocalWhatsAppMacStatusAvailable()) {
    return {
      ok: false,
      error: "WhatsApp sync is available in production (or local Supabase for Mac helper).",
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
    hint: "Run: npm run whatsapp-helper -- --tick (or --import-conversation for a one-shot local import).",
  };
}

/** Enable forward-only import on the Mac store (local mode only). */
export async function enableWhatsAppForwardOnlyAction(): Promise<
  { ok: true; status: WhatsAppUiStatus } | { ok: false; error: string }
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  if (!isLocalWhatsAppMacStatusAvailable()) {
    return {
      ok: false,
      error:
        "Forward-only cutoff is set on the Mac helper (npm run whatsapp-helper -- --enable-forward-only). Live activation uses --enable-live-destination.",
    };
  }
  try {
    const store = openWhatsAppSyncStore(defaultWhatsAppHome());
    try {
      store.enableForwardOnlyImport(new Date());
      const state = store.readState();
      const unmatched = store.listUnmatched();
      return {
        ok: true,
        status: formatWhatsAppStatus(state, unmatched.length, {
          destinationHost: "local",
          helperOnline: state.connectionState === "connected",
        }),
      };
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
