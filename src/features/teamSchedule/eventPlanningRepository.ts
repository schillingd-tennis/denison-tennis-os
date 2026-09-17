import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import { listPeople } from "@/features/people/repository";
import type { Person } from "@/features/people/types";
import { getDisplayName, getInitials, hasRole } from "@/features/people/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { packingGroup, withDefaultPacking } from "./defaultPackingList";
import {
  rowToAlumni,
  rowToEventTeam,
  rowToPacking,
  rowToPartyMember,
  rowToSession,
  rowToTravel,
  sessionToRow,
  travelToRow,
  type AlumniRow,
  type PackingRow,
  type PartyRow,
  type SessionRow,
  type TeamRow,
  type TravelRow,
} from "./eventPlanningMapping";
import type {
  PartyMemberKind,
  ScheduleAlumniAttendee,
  ScheduleAlumniAttendeeInput,
  ScheduleEventPlanningBundle,
  ScheduleEventPlanningNotes,
  ScheduleEventSession,
  ScheduleEventSessionInput,
  ScheduleEventTeam,
  SchedulePackingItem,
  SchedulePackingItemInput,
  SchedulePartyMember,
  ScheduleRosterCandidate,
  ScheduleTravelArrangement,
  ScheduleTravelArrangementInput,
} from "./eventPlanningTypes";
import { getScheduleEvent, saveScheduleEvent, TeamScheduleRepositoryError } from "./repository";
import { scheduleEventToInput } from "./scheduleInline";
import {
  resolveScheduleIdentityFromLabel,
  resolveSchoolIdentityFromLabelExact,
} from "./schoolIdentity";
import type { TeamScheduleEvent } from "./types";

const PARTY_TABLE = "team_schedule_event_party";
const TEAMS_TABLE = "team_schedule_event_teams";
const TRAVEL_TABLE = "team_schedule_event_travel";
const PASSENGERS_TABLE = "team_schedule_event_travel_passengers";
const SESSIONS_TABLE = "team_schedule_event_sessions";
const ALUMNI_TABLE = "team_schedule_event_alumni";
const PACKING_TABLE = "team_schedule_event_packing";
const PLANNING_TABLE = "team_schedule_event_planning";

function missingTable(message: string): boolean {
  return /schema cache|does not exist|could not find the table/i.test(message);
}

function personMeta(person: Person | undefined) {
  if (!person) return { displayName: "Unknown", initials: "?" as string, photoUrl: undefined, classYear: undefined };
  return {
    displayName: getDisplayName(person),
    initials: getInitials(person),
    photoUrl: person.photoUrl,
    classYear: person.classYear,
  };
}

function emptyPlanning(eventId: string): ScheduleEventPlanningBundle {
  return {
    party: [],
    teams: [],
    travel: [],
    sessions: [],
    alumni: [],
    packing: [],
    planning: { eventId, notes: null, updatedAt: null },
  };
}

export function buildScheduleRosterCandidates(people: readonly Person[]): ScheduleRosterCandidate[] {
  const candidates: ScheduleRosterCandidate[] = [];
  for (const person of people) {
    const isCurrent = person.status?.key === STATUS_KEYS.current;
    if (!isCurrent) continue;
    const isPlayer = hasRole(person, ROLE_KEYS.player);
    const isCoach = hasRole(person, ROLE_KEYS.coach) || hasRole(person, ROLE_KEYS.staff);
    if (!isPlayer && !isCoach) continue;
    const kind: PartyMemberKind = isPlayer ? "player" : "coach";
    candidates.push({
      id: person.id,
      displayName: getDisplayName(person),
      initials: getInitials(person),
      photoUrl: person.photoUrl,
      classYear: person.classYear,
      kind,
      secondary: [
        kind === "player" ? "Player" : "Coach",
        person.classYear != null ? String(person.classYear) : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }
  return candidates.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function buildAlumniCandidates(people: readonly Person[]): ScheduleRosterCandidate[] {
  return people
    .filter((person) => hasRole(person, ROLE_KEYS.player) || person.status?.key === STATUS_KEYS.former)
    .map((person) => ({
      id: person.id,
      displayName: getDisplayName(person),
      initials: getInitials(person),
      photoUrl: person.photoUrl,
      classYear: person.classYear,
      kind: "player" as const,
      secondary: person.classYear != null ? `Class of ${person.classYear}` : undefined,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

async function loadParty(eventId: string, peopleById: Map<string, Person>): Promise<SchedulePartyMember[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(PARTY_TABLE)
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order")
    .order("created_at");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new TeamScheduleRepositoryError(`Failed to load traveling party: ${error.message}`);
  }
  return ((data as PartyRow[] | null) ?? []).map((row) =>
    rowToPartyMember(row, personMeta(peopleById.get(row.person_id))),
  );
}

async function loadTeams(eventId: string): Promise<ScheduleEventTeam[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TEAMS_TABLE)
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order")
    .order("team_name");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new TeamScheduleRepositoryError(`Failed to load teams: ${error.message}`);
  }
  return ((data as TeamRow[] | null) ?? []).map(rowToEventTeam);
}

async function loadTravel(eventId: string): Promise<ScheduleTravelArrangement[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(TRAVEL_TABLE)
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order")
    .order("created_at");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new TeamScheduleRepositoryError(`Failed to load travel: ${error.message}`);
  }
  const rows = (data as TravelRow[] | null) ?? [];
  if (rows.length === 0) return [];

  const travelIds = rows.map((row) => row.id);
  const { data: passengerData, error: passengerError } = await client
    .from(PASSENGERS_TABLE)
    .select("travel_id, person_id")
    .in("travel_id", travelIds);
  if (passengerError && !missingTable(passengerError.message)) {
    throw new TeamScheduleRepositoryError(`Failed to load passengers: ${passengerError.message}`);
  }
  const byTravel = new Map<string, string[]>();
  for (const row of (passengerData as { travel_id: string; person_id: string }[] | null) ?? []) {
    const list = byTravel.get(row.travel_id) ?? [];
    list.push(row.person_id);
    byTravel.set(row.travel_id, list);
  }
  return rows.map((row) => rowToTravel(row, byTravel.get(row.id) ?? []));
}

async function loadSessions(eventId: string): Promise<ScheduleEventSession[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(SESSIONS_TABLE)
    .select("*")
    .eq("event_id", eventId)
    .order("session_date")
    .order("sort_order")
    .order("start_time");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new TeamScheduleRepositoryError(`Failed to load sessions: ${error.message}`);
  }
  return ((data as SessionRow[] | null) ?? []).map(rowToSession);
}

async function loadAlumni(
  eventId: string,
  peopleById: Map<string, Person>,
): Promise<ScheduleAlumniAttendee[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(ALUMNI_TABLE)
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order")
    .order("created_at");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new TeamScheduleRepositoryError(`Failed to load alumni: ${error.message}`);
  }
  return ((data as AlumniRow[] | null) ?? []).map((row) => {
    const person = row.person_id ? peopleById.get(row.person_id) : undefined;
    const displayName = person
      ? getDisplayName(person)
      : row.guest_name?.trim() || "Guest";
    return rowToAlumni(row, displayName);
  });
}

async function loadPacking(eventId: string): Promise<SchedulePackingItem[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(PACKING_TABLE)
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order")
    .order("item_name");
  if (error) {
    if (missingTable(error.message)) return [];
    throw new TeamScheduleRepositoryError(`Failed to load packing list: ${error.message}`);
  }
  return withDefaultPacking(eventId, ((data as PackingRow[] | null) ?? []).map(rowToPacking));
}

async function loadPlanningNotes(eventId: string): Promise<ScheduleEventPlanningNotes> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(PLANNING_TABLE)
    .select("event_id, notes, updated_at")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) {
    if (missingTable(error.message)) return { eventId, notes: null, updatedAt: null };
    throw new TeamScheduleRepositoryError(`Failed to load planning notes: ${error.message}`);
  }
  if (!data) return { eventId, notes: null, updatedAt: null };
  const row = data as { event_id: string; notes: string | null; updated_at: string | null };
  return { eventId: row.event_id, notes: row.notes, updatedAt: row.updated_at };
}

export async function loadScheduleEventPlanning(eventId: string): Promise<ScheduleEventPlanningBundle> {
  try {
    const people = await listPeople();
    const peopleById = new Map(people.map((person) => [person.id, person]));
    const [party, teams, travel, sessions, alumni, packing, planning] = await Promise.all([
      loadParty(eventId, peopleById),
      loadTeams(eventId),
      loadTravel(eventId),
      loadSessions(eventId),
      loadAlumni(eventId, peopleById),
      loadPacking(eventId),
      loadPlanningNotes(eventId),
    ]);
    return { party, teams, travel, sessions, alumni, packing, planning };
  } catch (error) {
    if (error instanceof TeamScheduleRepositoryError && missingTable(error.message)) {
      return emptyPlanning(eventId);
    }
    throw error;
  }
}

export async function setTravelingParty(
  eventId: string,
  members: readonly { personId: string; memberKind: PartyMemberKind; notes?: string | null }[],
): Promise<SchedulePartyMember[]> {
  const client = await createSupabaseServerClient();
  const unique = new Map<string, { personId: string; memberKind: PartyMemberKind; notes?: string | null }>();
  for (const member of members) {
    const personId = member.personId.trim();
    if (!personId) continue;
    unique.set(personId, { ...member, personId });
  }

  const { data: existing, error: existingError } = await client
    .from(PARTY_TABLE)
    .select("id, person_id")
    .eq("event_id", eventId);
  if (existingError) throw new TeamScheduleRepositoryError(existingError.message);

  const existingRows = (existing as { id: string; person_id: string }[] | null) ?? [];
  const desiredIds = new Set(unique.keys());
  const toDelete = existingRows.filter((row) => !desiredIds.has(row.person_id)).map((row) => row.id);
  if (toDelete.length > 0) {
    const { error } = await client.from(PARTY_TABLE).delete().in("id", toDelete);
    if (error) throw new TeamScheduleRepositoryError(error.message);
  }

  let sortOrder = 0;
  for (const member of unique.values()) {
    const { error } = await client.from(PARTY_TABLE).upsert(
      {
        event_id: eventId,
        person_id: member.personId,
        member_kind: member.memberKind,
        notes: member.notes?.trim() || null,
        sort_order: sortOrder++,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,person_id" },
    );
    if (error) throw new TeamScheduleRepositoryError(error.message);
  }

  const people = await listPeople();
  const peopleById = new Map(people.map((person) => [person.id, person]));
  return loadParty(eventId, peopleById);
}

export async function addTravelingPartyMembers(
  eventId: string,
  personIds: readonly string[],
  memberKind: PartyMemberKind = "player",
): Promise<SchedulePartyMember[]> {
  const client = await createSupabaseServerClient();
  const { data: existing, error: existingError } = await client
    .from(PARTY_TABLE)
    .select("person_id, sort_order")
    .eq("event_id", eventId);
  if (existingError) throw new TeamScheduleRepositoryError(existingError.message);
  const already = new Set(((existing as { person_id: string }[] | null) ?? []).map((row) => row.person_id));
  const maxSort = Math.max(0, ...(((existing as { sort_order: number }[] | null) ?? []).map((r) => r.sort_order)));
  const inserts = [...new Set(personIds.map((id) => id.trim()).filter(Boolean))]
    .filter((id) => !already.has(id))
    .map((person_id, index) => ({
      event_id: eventId,
      person_id,
      member_kind: memberKind,
      sort_order: maxSort + index + 1,
    }));
  if (inserts.length > 0) {
    const { error } = await client.from(PARTY_TABLE).insert(inserts);
    if (error) throw new TeamScheduleRepositoryError(error.message);
  }
  const people = await listPeople();
  return loadParty(eventId, new Map(people.map((p) => [p.id, p])));
}

export async function removeTravelingPartyMember(
  eventId: string,
  personId: string,
): Promise<SchedulePartyMember[]> {
  const client = await createSupabaseServerClient();
  const { error } = await client
    .from(PARTY_TABLE)
    .delete()
    .eq("event_id", eventId)
    .eq("person_id", personId);
  if (error) throw new TeamScheduleRepositoryError(error.message);
  const people = await listPeople();
  return loadParty(eventId, new Map(people.map((p) => [p.id, p])));
}

async function syncTeamsInEventText(eventId: string, teams: ScheduleEventTeam[]): Promise<void> {
  const event = await getScheduleEvent(eventId);
  if (!event) return;
  const teamsInEvent = teams.map((team) => team.teamName).join(", ") || null;
  if ((event.teamsInEvent ?? null) === teamsInEvent) return;
  await saveScheduleEvent(eventId, { ...scheduleEventToInput(event), teamsInEvent });
}

export async function addEventTeam(eventId: string, teamName: string): Promise<ScheduleEventTeam[]> {
  const name = teamName.trim();
  if (!name) throw new TeamScheduleRepositoryError("Team name is required.");
  const identity =
    resolveSchoolIdentityFromLabelExact(name) ?? resolveScheduleIdentityFromLabel(name);
  const client = await createSupabaseServerClient();
  const { data: existing } = await client
    .from(TEAMS_TABLE)
    .select("sort_order")
    .eq("event_id", eventId);
  const maxSort = Math.max(0, ...(((existing as { sort_order: number }[] | null) ?? []).map((r) => r.sort_order)));
  const { error } = await client.from(TEAMS_TABLE).insert({
    event_id: eventId,
    team_name: name,
    identity_slug: identity?.slug ?? null,
    sort_order: maxSort + 1,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (/unique|duplicate/i.test(error.message)) {
      throw new TeamScheduleRepositoryError("That team is already listed for this event.");
    }
    throw new TeamScheduleRepositoryError(error.message);
  }
  const teams = await loadTeams(eventId);
  await syncTeamsInEventText(eventId, teams);
  return teams;
}

export async function removeEventTeam(eventId: string, teamId: string): Promise<ScheduleEventTeam[]> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from(TEAMS_TABLE).delete().eq("id", teamId).eq("event_id", eventId);
  if (error) throw new TeamScheduleRepositoryError(error.message);
  const teams = await loadTeams(eventId);
  await syncTeamsInEventText(eventId, teams);
  return teams;
}

export async function seedTeamsFromEvent(event: TeamScheduleEvent): Promise<ScheduleEventTeam[]> {
  const existing = await loadTeams(event.id);
  if (existing.length > 0) return existing;
  const names: string[] = [];
  if (event.opponentName?.trim()) names.push(event.opponentName.trim());
  if (event.teamsInEvent?.trim()) {
    for (const part of event.teamsInEvent.split(/[,;]/)) {
      const name = part.trim();
      if (name && !names.some((n) => n.toLowerCase() === name.toLowerCase())) names.push(name);
    }
  }
  for (const name of names) {
    try {
      await addEventTeam(event.id, name);
    } catch {
      // Ignore duplicates while seeding.
    }
  }
  return loadTeams(event.id);
}

async function replaceTravelPassengers(travelId: string, personIds: readonly string[]): Promise<void> {
  const client = await createSupabaseServerClient();
  const { error: deleteError } = await client.from(PASSENGERS_TABLE).delete().eq("travel_id", travelId);
  if (deleteError) throw new TeamScheduleRepositoryError(deleteError.message);
  const unique = [...new Set(personIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return;
  const { error } = await client.from(PASSENGERS_TABLE).insert(
    unique.map((person_id) => ({ travel_id: travelId, person_id })),
  );
  if (error) throw new TeamScheduleRepositoryError(error.message);
}

export async function saveTravelArrangement(
  eventId: string,
  id: string | null,
  input: ScheduleTravelArrangementInput,
): Promise<ScheduleTravelArrangement[]> {
  const client = await createSupabaseServerClient();
  const payload = travelToRow(eventId, input);
  let travelId = id;
  if (id) {
    const { error } = await client.from(TRAVEL_TABLE).update(payload).eq("id", id).eq("event_id", eventId);
    if (error) throw new TeamScheduleRepositoryError(error.message);
  } else {
    const { data, error } = await client.from(TRAVEL_TABLE).insert(payload).select("id").single();
    if (error) throw new TeamScheduleRepositoryError(error.message);
    travelId = (data as { id: string }).id;
  }
  if (travelId) {
    await replaceTravelPassengers(travelId, input.passengerPersonIds ?? []);
  }
  return loadTravel(eventId);
}

export async function deleteTravelArrangement(
  eventId: string,
  travelId: string,
): Promise<ScheduleTravelArrangement[]> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from(TRAVEL_TABLE).delete().eq("id", travelId).eq("event_id", eventId);
  if (error) throw new TeamScheduleRepositoryError(error.message);
  return loadTravel(eventId);
}

export async function saveEventSession(
  eventId: string,
  id: string | null,
  input: ScheduleEventSessionInput,
): Promise<ScheduleEventSession[]> {
  if (!input.sessionDate?.trim()) {
    throw new TeamScheduleRepositoryError("Session date is required.");
  }
  const client = await createSupabaseServerClient();
  const payload = sessionToRow(eventId, input);
  if (id) {
    const { error } = await client.from(SESSIONS_TABLE).update(payload).eq("id", id).eq("event_id", eventId);
    if (error) throw new TeamScheduleRepositoryError(error.message);
  } else {
    const { error } = await client.from(SESSIONS_TABLE).insert(payload);
    if (error) throw new TeamScheduleRepositoryError(error.message);
  }
  return loadSessions(eventId);
}

export async function deleteEventSession(
  eventId: string,
  sessionId: string,
): Promise<ScheduleEventSession[]> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from(SESSIONS_TABLE).delete().eq("id", sessionId).eq("event_id", eventId);
  if (error) throw new TeamScheduleRepositoryError(error.message);
  return loadSessions(eventId);
}

export async function saveAlumniAttendee(
  eventId: string,
  id: string | null,
  input: ScheduleAlumniAttendeeInput,
): Promise<ScheduleAlumniAttendee[]> {
  const personId = input.personId?.trim() || null;
  const guestName = input.guestName?.trim() || null;
  if (!personId && !guestName) {
    throw new TeamScheduleRepositoryError("Select an alumni person or enter a guest name.");
  }
  const client = await createSupabaseServerClient();
  const payload = {
    event_id: eventId,
    person_id: personId,
    guest_name: guestName,
    class_year: input.classYear ?? null,
    rsvp_status: input.rsvpStatus ?? "invited",
    guest_count: input.guestCount ?? 0,
    notes: input.notes?.trim() || null,
    sort_order: input.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
  if (id) {
    const { error } = await client.from(ALUMNI_TABLE).update(payload).eq("id", id).eq("event_id", eventId);
    if (error) throw new TeamScheduleRepositoryError(error.message);
  } else {
    const { error } = await client.from(ALUMNI_TABLE).insert(payload);
    if (error) throw new TeamScheduleRepositoryError(error.message);
  }
  const people = await listPeople();
  return loadAlumni(eventId, new Map(people.map((p) => [p.id, p])));
}

export async function deleteAlumniAttendee(
  eventId: string,
  alumniId: string,
): Promise<ScheduleAlumniAttendee[]> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from(ALUMNI_TABLE).delete().eq("id", alumniId).eq("event_id", eventId);
  if (error) throw new TeamScheduleRepositoryError(error.message);
  const people = await listPeople();
  return loadAlumni(eventId, new Map(people.map((p) => [p.id, p])));
}

export async function savePackingItem(
  eventId: string,
  id: string | null,
  input: SchedulePackingItemInput,
): Promise<SchedulePackingItem[]> {
  const itemName = input.itemName.trim();
  if (!itemName) throw new TeamScheduleRepositoryError("Item name is required.");
  const client = await createSupabaseServerClient();
  const payload = {
    event_id: eventId,
    item_name: itemName,
    quantity: input.quantity ?? 1,
    responsible: input.responsible?.trim() || null,
    notes: input.notes?.trim() || null,
    is_checked: input.isChecked ?? false,
    is_starter: input.isStarter ?? false,
    sort_order: input.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
  if (id) {
    const { error } = await client.from(PACKING_TABLE).update(payload).eq("id", id).eq("event_id", eventId);
    if (error) {
      if (/unique|duplicate/i.test(error.message)) {
        throw new TeamScheduleRepositoryError("That packing item already exists for this event.");
      }
      throw new TeamScheduleRepositoryError(error.message);
    }
  } else {
    const { error } = packingGroup(itemName) !== "Additional items"
      ? await client.from(PACKING_TABLE).upsert(payload, { onConflict: "event_id,item_name" })
      : await client.from(PACKING_TABLE).insert(payload);
    if (error) {
      if (/unique|duplicate/i.test(error.message)) {
        throw new TeamScheduleRepositoryError("That packing item already exists for this event.");
      }
      throw new TeamScheduleRepositoryError(error.message);
    }
  }
  return loadPacking(eventId);
}

export async function deletePackingItem(
  eventId: string,
  itemId: string,
): Promise<SchedulePackingItem[]> {
  const client = await createSupabaseServerClient();
  const { error } = await client.from(PACKING_TABLE).delete().eq("id", itemId).eq("event_id", eventId);
  if (error) throw new TeamScheduleRepositoryError(error.message);
  return loadPacking(eventId);
}

export async function seedDefaultPackingList(eventId: string): Promise<SchedulePackingItem[]> {
  return loadPacking(eventId);
}

export async function savePlanningNotes(
  eventId: string,
  notes: string | null,
): Promise<ScheduleEventPlanningNotes> {
  const client = await createSupabaseServerClient();
  const payload = {
    event_id: eventId,
    notes: notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from(PLANNING_TABLE).upsert(payload, { onConflict: "event_id" });
  if (error) throw new TeamScheduleRepositoryError(error.message);
  return loadPlanningNotes(eventId);
}
