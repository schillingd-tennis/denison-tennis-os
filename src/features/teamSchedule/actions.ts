"use server";

import { revalidatePath } from "next/cache";

import { TEAM_OPERATIONS_SCHEDULE_ROUTE } from "@/lib/module-routes";

import { normalizeScheduleInput } from "./mapping";
import { deleteScheduleEvent, saveScheduleEvent } from "./repository";
import type { TeamScheduleEvent, TeamScheduleEventInput } from "./types";

function revalidateSchedule() {
  revalidatePath(TEAM_OPERATIONS_SCHEDULE_ROUTE);
}

export async function saveScheduleEventAction(
  id: string | null,
  input: Partial<TeamScheduleEventInput>,
): Promise<{ success: true; event: TeamScheduleEvent } | { success: false; error: string }> {
  const parsed = normalizeScheduleInput(input);
  if ("error" in parsed) return { success: false, error: parsed.error };
  try {
    const event = await saveScheduleEvent(id, parsed.input);
    revalidateSchedule();
    return { success: true, event };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Save failed." };
  }
}

export async function deleteScheduleEventAction(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await deleteScheduleEvent(id);
    revalidateSchedule();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Delete failed." };
  }
}

export async function duplicateScheduleEventAction(
  source: TeamScheduleEvent,
): Promise<{ success: true; event: TeamScheduleEvent } | { success: false; error: string }> {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = source;
  const input: TeamScheduleEventInput = {
    ...rest,
    opponentName: source.opponentName ? `${source.opponentName} (copy)` : source.opponentName,
    eventName: !source.opponentName && source.eventName ? `${source.eventName} (copy)` : source.eventName,
    sortOrder: source.sortOrder + 1,
  };
  return saveScheduleEventAction(null, input);
}
