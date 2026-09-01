/**
 * Persistent Contact Today opportunity actions (Today Beta v0.1).
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ContactOpportunityType } from "./contactOpportunityScore";
import { CADENCE_SNOOZE_DAYS } from "./contactWorkflowConfig";

export type ContactOpportunityActionKind = "HANDLED" | "DISMISSED" | "SNOOZED";

export type ContactOpportunityAction = {
  id: string;
  recruitPersonId: string;
  opportunityType: ContactOpportunityType;
  action: ContactOpportunityActionKind;
  matchResultId: string | null;
  upcomingTournamentId: string | null;
  interactionId: string | null;
  snoozeUntil: string | null;
  actedAt: string;
};

const ACTIONS_TABLE = "contact_opportunity_actions";

type ActionRow = {
  id: string;
  recruit_person_id: string;
  opportunity_type: ContactOpportunityType;
  action: ContactOpportunityActionKind;
  match_result_id: string | null;
  upcoming_tournament_id: string | null;
  interaction_id: string | null;
  snooze_until: string | null;
  acted_at: string;
};

function mapRow(row: ActionRow): ContactOpportunityAction {
  return {
    id: row.id,
    recruitPersonId: row.recruit_person_id,
    opportunityType: row.opportunity_type,
    action: row.action,
    matchResultId: row.match_result_id,
    upcomingTournamentId: row.upcoming_tournament_id,
    interactionId: row.interaction_id,
    snoozeUntil: row.snooze_until,
    actedAt: row.acted_at,
  };
}

export async function listContactOpportunityActions(
  recruitPersonIds?: readonly string[],
): Promise<ContactOpportunityAction[]> {
  const client = await createSupabaseServerClient();
  let query = client.from(ACTIONS_TABLE).select("*").order("acted_at", { ascending: false });

  if (recruitPersonIds && recruitPersonIds.length > 0) {
    query = query.in("recruit_person_id", [...recruitPersonIds]);
  }

  const { data, error } = await query;
  if (error) {
    if (/does not exist|schema cache|could not find/i.test(error.message)) {
      return [];
    }
    throw new Error(`Failed to load contact opportunity actions: ${error.message}`);
  }

  return ((data ?? []) as ActionRow[]).map(mapRow);
}

export function actionsByRecruitPersonId(
  actions: readonly ContactOpportunityAction[],
): Map<string, ContactOpportunityAction[]> {
  const map = new Map<string, ContactOpportunityAction[]>();
  for (const action of actions) {
    const bucket = map.get(action.recruitPersonId) ?? [];
    bucket.push(action);
    map.set(action.recruitPersonId, bucket);
  }
  return map;
}

export function isResultOpportunityActioned(
  matchResultId: string,
  actions: readonly ContactOpportunityAction[],
): boolean {
  return actions.some(
    (action) =>
      action.opportunityType === "RESULT" &&
      action.matchResultId === matchResultId &&
      (action.action === "HANDLED" || action.action === "DISMISSED"),
  );
}

export function isTournamentOpportunityActioned(
  upcomingTournamentId: string,
  actions: readonly ContactOpportunityAction[],
): boolean {
  return actions.some(
    (action) =>
      action.opportunityType === "TOURNAMENT" &&
      action.upcomingTournamentId === upcomingTournamentId &&
      (action.action === "HANDLED" || action.action === "DISMISSED"),
  );
}

export function filterActionableMatchResults<T extends { id: string }>(
  matchResults: readonly T[],
  actions: readonly ContactOpportunityAction[],
): T[] {
  return matchResults.filter((result) => !isResultOpportunityActioned(result.id, actions));
}

export function filterActionableTournaments<T extends { id: string }>(
  tournaments: readonly T[],
  actions: readonly ContactOpportunityAction[],
): T[] {
  return tournaments.filter(
    (tournament) => !isTournamentOpportunityActioned(tournament.id, actions),
  );
}

export function isCadenceOpportunitySnoozed(
  actions: readonly ContactOpportunityAction[],
  now: Date = new Date(),
): boolean {
  const nowMs = now.getTime();
  return actions.some(
    (action) =>
      action.opportunityType === "CADENCE" &&
      action.action === "SNOOZED" &&
      action.snoozeUntil != null &&
      Date.parse(action.snoozeUntil) > nowMs,
  );
}

export async function insertContactOpportunityAction(input: {
  recruitPersonId: string;
  opportunityType: ContactOpportunityType;
  action: ContactOpportunityActionKind;
  matchResultId?: string | null;
  upcomingTournamentId?: string | null;
  interactionId?: string | null;
  snoozeUntil?: string | null;
}): Promise<ContactOpportunityAction> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(ACTIONS_TABLE)
    .insert({
      recruit_person_id: input.recruitPersonId,
      opportunity_type: input.opportunityType,
      action: input.action,
      match_result_id: input.matchResultId ?? null,
      upcoming_tournament_id: input.upcomingTournamentId ?? null,
      interaction_id: input.interactionId ?? null,
      snooze_until: input.snoozeUntil ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to record contact opportunity action: ${error.message}`);
  }

  return mapRow(data as ActionRow);
}

export function cadenceSnoozeUntil(now: Date = new Date()): string {
  const until = new Date(now);
  until.setDate(until.getDate() + CADENCE_SNOOZE_DAYS);
  return until.toISOString();
}
