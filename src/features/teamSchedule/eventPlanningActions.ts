"use server";

import { revalidatePath } from "next/cache";

import {
  TEAM_OPERATIONS_SCHEDULE_ROUTE,
  teamOperationsScheduleEventPath,
} from "@/lib/module-routes";

import {
  addEventTeam,
  addTravelingPartyMembers,
  deleteAlumniAttendee,
  deleteEventSession,
  deletePackingItem,
  deleteTravelArrangement,
  removeEventTeam,
  removeTravelingPartyMember,
  saveAlumniAttendee,
  saveEventSession,
  savePackingItem,
  savePlanningNotes,
  saveTravelArrangement,
  seedDefaultPackingList,
  setTravelingParty,
} from "./eventPlanningRepository";
import type {
  PartyMemberKind,
  ScheduleAlumniAttendee,
  ScheduleAlumniAttendeeInput,
  ScheduleEventPlanningNotes,
  ScheduleEventSession,
  ScheduleEventSessionInput,
  ScheduleEventTeam,
  SchedulePackingItem,
  SchedulePackingItemInput,
  SchedulePartyMember,
  ScheduleTravelArrangement,
  ScheduleTravelArrangementInput,
} from "./eventPlanningTypes";

function revalidateEvent(eventId: string) {
  revalidatePath(TEAM_OPERATIONS_SCHEDULE_ROUTE);
  revalidatePath(teamOperationsScheduleEventPath(eventId));
}

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function fail(error: unknown): { success: false; error: string } {
  return { success: false, error: error instanceof Error ? error.message : "Save failed." };
}

export async function setTravelingPartyAction(
  eventId: string,
  members: readonly { personId: string; memberKind: PartyMemberKind; notes?: string | null }[],
): Promise<ActionResult<SchedulePartyMember[]>> {
  try {
    const data = await setTravelingParty(eventId, members);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function addTravelingPartyMembersAction(
  eventId: string,
  personIds: readonly string[],
  memberKind: PartyMemberKind = "player",
): Promise<ActionResult<SchedulePartyMember[]>> {
  try {
    const data = await addTravelingPartyMembers(eventId, personIds, memberKind);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function removeTravelingPartyMemberAction(
  eventId: string,
  personId: string,
): Promise<ActionResult<SchedulePartyMember[]>> {
  try {
    const data = await removeTravelingPartyMember(eventId, personId);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function addEventTeamAction(
  eventId: string,
  teamName: string,
): Promise<ActionResult<ScheduleEventTeam[]>> {
  try {
    const data = await addEventTeam(eventId, teamName);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function removeEventTeamAction(
  eventId: string,
  teamId: string,
): Promise<ActionResult<ScheduleEventTeam[]>> {
  try {
    const data = await removeEventTeam(eventId, teamId);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function saveTravelArrangementAction(
  eventId: string,
  id: string | null,
  input: ScheduleTravelArrangementInput,
): Promise<ActionResult<ScheduleTravelArrangement[]>> {
  try {
    const data = await saveTravelArrangement(eventId, id, input);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteTravelArrangementAction(
  eventId: string,
  travelId: string,
): Promise<ActionResult<ScheduleTravelArrangement[]>> {
  try {
    const data = await deleteTravelArrangement(eventId, travelId);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function saveEventSessionAction(
  eventId: string,
  id: string | null,
  input: ScheduleEventSessionInput,
): Promise<ActionResult<ScheduleEventSession[]>> {
  try {
    const data = await saveEventSession(eventId, id, input);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteEventSessionAction(
  eventId: string,
  sessionId: string,
): Promise<ActionResult<ScheduleEventSession[]>> {
  try {
    const data = await deleteEventSession(eventId, sessionId);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function saveAlumniAttendeeAction(
  eventId: string,
  id: string | null,
  input: ScheduleAlumniAttendeeInput,
): Promise<ActionResult<ScheduleAlumniAttendee[]>> {
  try {
    const data = await saveAlumniAttendee(eventId, id, input);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAlumniAttendeeAction(
  eventId: string,
  alumniId: string,
): Promise<ActionResult<ScheduleAlumniAttendee[]>> {
  try {
    const data = await deleteAlumniAttendee(eventId, alumniId);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function savePackingItemAction(
  eventId: string,
  id: string | null,
  input: SchedulePackingItemInput,
): Promise<ActionResult<SchedulePackingItem[]>> {
  try {
    const data = await savePackingItem(eventId, id, input);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePackingItemAction(
  eventId: string,
  itemId: string,
): Promise<ActionResult<SchedulePackingItem[]>> {
  try {
    const data = await deletePackingItem(eventId, itemId);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function seedDefaultPackingListAction(
  eventId: string,
): Promise<ActionResult<SchedulePackingItem[]>> {
  try {
    const data = await seedDefaultPackingList(eventId);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function savePlanningNotesAction(
  eventId: string,
  notes: string | null,
): Promise<ActionResult<ScheduleEventPlanningNotes>> {
  try {
    const data = await savePlanningNotes(eventId, notes);
    revalidateEvent(eventId);
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}
