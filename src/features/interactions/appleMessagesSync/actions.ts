"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isManualAppleMessagesSyncAvailable } from "./environment";
import { JobQueueError, createJobQueue, enqueueManualForUser, readStatusForUser } from "./jobQueue";
import { createSupabaseJobStore } from "./jobQueueSupabase";
import type { EnqueueResult, SyncStatus } from "./ports";

async function authedQueue() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return {
    queue: createJobQueue(createSupabaseJobStore(supabase)),
    userId: user?.id ?? null,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof JobQueueError) return error.message;
  if (error instanceof Error) return error.message;
  return "Apple Messages sync is unavailable.";
}

export async function queueAppleMessagesSyncAction(): Promise<
  { ok: true; result: EnqueueResult } | { ok: false; error: string }
> {
  try {
    if (!isManualAppleMessagesSyncAvailable()) {
      return { ok: false, error: "Apple Messages sync is available in production." };
    }
    const { queue, userId } = await authedQueue();
    const result = await enqueueManualForUser(queue, userId);
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function getAppleMessagesSyncStatusAction(): Promise<
  { ok: true; status: SyncStatus } | { ok: false; error: string }
> {
  try {
    const { queue, userId } = await authedQueue();
    const status = await readStatusForUser(queue, userId);
    return { ok: true, status };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
