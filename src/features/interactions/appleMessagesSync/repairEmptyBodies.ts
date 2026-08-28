import {
  APPLE_MESSAGES_SOURCE_SYSTEM,
  extractAppleMessageBody,
  isCorruptedNotes,
  isPlaceholderNotes,
  isReadableAppleMessageBody,
} from "../appleMessages";
import { isLocalSupabaseHost, isProductionSupabaseHost } from "../appleMessages";

import type { AppleScanRow } from "./scan";
import type { SupabaseClient } from "@supabase/supabase-js";

export const REPAIR_EMPTY_BODIES_FLAG = "--repair-empty-bodies";
export const APPLY_PRODUCTION_FLAG = "--apply-production";
export const CONFIRM_PRODUCTION_BODY_REPAIR_FLAG = "--confirm-production-body-repair";

export type RepairInteractionRow = {
  id: string;
  sourceSystem: string | null;
  sourceKey: string | null;
  notes: string | null;
  recruitPersonId?: string | null;
};

export type RepairCounts = {
  eligible: number;
  corruptedCandidates: number;
  placeholderCandidates: number;
  decoded: number;
  decodedFromText: number;
  decodedFromAttributedBody: number;
  attachmentOnly: number;
  stillDecodeFailed: number;
  missingLocalGuid: number;
  wouldUpdate: number;
  updated: number;
  currentTeamSkipped: number;
};

export type PlaceholderNotesInventory = {
  appleRows: number;
  emptyNotes: number;
  inboundNotes: number;
  outboundNotes: number;
  corruptedNotes: number;
  cleanNotes: number;
};

export function hasRepairEmptyBodiesFlag(argv: string[]): boolean {
  return argv.includes(REPAIR_EMPTY_BODIES_FLAG);
}

export function parseRepairFlags(argv: string[]): {
  repair: boolean;
  applyProduction: boolean;
  confirmProduction: boolean;
} {
  return {
    repair: hasRepairEmptyBodiesFlag(argv),
    applyProduction: argv.includes(APPLY_PRODUCTION_FLAG),
    confirmProduction: argv.includes(CONFIRM_PRODUCTION_BODY_REPAIR_FLAG),
  };
}

export function assertRepairApplyAllowed(input: {
  host: string;
  applyProduction: boolean;
  confirmProduction: boolean;
}): void {
  if (!input.applyProduction) return;
  if (!input.confirmProduction) {
    throw new Error("Refusing production body repair without --confirm-production-body-repair.");
  }
  if (isLocalSupabaseHost(input.host) || !isProductionSupabaseHost(input.host)) {
    throw new Error(`Refusing --apply-production: host "${input.host}" is not hosted production.`);
  }
}

export function isRepairEligible(
  row: RepairInteractionRow,
  currentTeamPersonIds: ReadonlySet<string> = new Set(),
): boolean {
  if (row.recruitPersonId && currentTeamPersonIds.has(row.recruitPersonId)) return false;
  if (row.sourceSystem !== APPLE_MESSAGES_SOURCE_SYSTEM) return false;
  if (!row.sourceKey?.trim()) return false;
  if (isPlaceholderNotes(row.notes)) return true;
  if (isCorruptedNotes(row.notes)) return true;
  return false;
}

export type RepairPlanRow = {
  id: string;
  sourceKey: string;
  outcome: "decoded" | "attachment" | "decode_failed" | "missing_local_guid" | "unchanged";
  notes: string | null;
};

export function planBodyRepair(
  rows: RepairInteractionRow[],
  localByGuid: Map<string, AppleScanRow>,
  currentTeamPersonIds: ReadonlySet<string> = new Set(),
): { counts: RepairCounts; plans: RepairPlanRow[] } {
  const currentTeamSkipped = rows.filter(
    (row) =>
      row.sourceSystem === APPLE_MESSAGES_SOURCE_SYSTEM &&
      Boolean(row.recruitPersonId && currentTeamPersonIds.has(row.recruitPersonId)),
  ).length;
  const eligible = rows.filter((row) => isRepairEligible(row, currentTeamPersonIds));
  const plans: RepairPlanRow[] = [];
  const counts: RepairCounts = {
    eligible: eligible.length,
    corruptedCandidates: eligible.filter((row) => isCorruptedNotes(row.notes)).length,
    placeholderCandidates: eligible.filter((row) => isPlaceholderNotes(row.notes)).length,
    decoded: 0,
    decodedFromText: 0,
    decodedFromAttributedBody: 0,
    attachmentOnly: 0,
    stillDecodeFailed: 0,
    missingLocalGuid: 0,
    wouldUpdate: 0,
    updated: 0,
    currentTeamSkipped,
  };

  for (const row of eligible) {
    const sourceKey = row.sourceKey!.trim();
    const local = localByGuid.get(sourceKey);
    if (!local) {
      counts.missingLocalGuid += 1;
      plans.push({ id: row.id, sourceKey, outcome: "missing_local_guid", notes: null });
      continue;
    }
    const extracted = extractAppleMessageBody({
      text: local.text,
      attributedBody: local.attributedBody,
      hasAttachments: local.hasAttachments,
    });
    if (extracted.status === "ok") {
      const normalizedExisting = row.notes?.trim() ?? "";
      if (
        normalizedExisting &&
        isReadableAppleMessageBody(normalizedExisting) &&
        normalizeExistingBody(normalizedExisting) === extracted.body
      ) {
        plans.push({ id: row.id, sourceKey, outcome: "unchanged", notes: null });
        continue;
      }
      if (extracted.source === "attachment") counts.attachmentOnly += 1;
      else {
        counts.decoded += 1;
        if (extracted.source === "text") counts.decodedFromText += 1;
        if (extracted.source === "attributed_body") counts.decodedFromAttributedBody += 1;
      }
      counts.wouldUpdate += 1;
      plans.push({
        id: row.id,
        sourceKey,
        outcome: extracted.source === "attachment" ? "attachment" : "decoded",
        notes: extracted.body,
      });
      continue;
    }
    counts.stillDecodeFailed += 1;
    plans.push({ id: row.id, sourceKey, outcome: "decode_failed", notes: null });
  }

  return { counts, plans };
}

function normalizeExistingBody(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

export function applyBodyRepair(
  plans: RepairPlanRow[],
  flags: { applyProduction: boolean; confirmProduction: boolean; host: string },
): RepairPlanRow[] {
  assertRepairApplyAllowed(flags);
  return plans.filter((plan) => plan.notes != null);
}

export async function applyBodyRepairUpdates(
  client: SupabaseClient,
  plans: RepairPlanRow[],
  rowsById: Map<string, RepairInteractionRow>,
  currentTeamPersonIds: ReadonlySet<string>,
  flags: { applyProduction: boolean; confirmProduction: boolean; host: string },
): Promise<{ updated: number; failures: number }> {
  assertRepairApplyAllowed(flags);
  let updated = 0;
  let failures = 0;

  for (const plan of plans) {
    if (plan.notes == null) continue;
    if (plan.outcome !== "decoded" && plan.outcome !== "attachment") continue;

    const row = rowsById.get(plan.id);
    if (!row || !isRepairEligible(row, currentTeamPersonIds)) continue;

    const { data, error } = await client
      .from("recruiting_interactions")
      .update({ notes: plan.notes })
      .eq("id", plan.id)
      .eq("source_system", APPLE_MESSAGES_SOURCE_SYSTEM)
      .eq("source_key", plan.sourceKey)
      .select("id");

    if (error) {
      failures += 1;
      continue;
    }
    if (!data?.length) continue;
    updated += 1;
  }

  return { updated, failures };
}

type RepairSupabaseClient = SupabaseClient;

export async function fetchAppleInteractionsForRepair(
  client: RepairSupabaseClient,
): Promise<RepairInteractionRow[]> {
  const { data, error } = await client
    .from("recruiting_interactions")
    .select("id,source_system,source_key,notes,recruit_person_id")
    .eq("source_system", APPLE_MESSAGES_SOURCE_SYSTEM)
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    sourceSystem: (row.source_system as string | null) ?? null,
    sourceKey: (row.source_key as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    recruitPersonId: (row.recruit_person_id as string | null) ?? null,
  }));
}

export function placeholderNotesInventory(rows: RepairInteractionRow[]): PlaceholderNotesInventory {
  let emptyNotes = 0;
  let inboundNotes = 0;
  let outboundNotes = 0;
  let corruptedNotes = 0;
  let cleanNotes = 0;
  for (const row of rows) {
    const value = row.notes?.trim() ?? "";
    if (!value) emptyNotes += 1;
    else if (value.toLowerCase() === "inbound") inboundNotes += 1;
    else if (value.toLowerCase() === "outbound") outboundNotes += 1;
    else if (isCorruptedNotes(row.notes)) corruptedNotes += 1;
    else cleanNotes += 1;
  }
  return {
    appleRows: rows.length,
    emptyNotes,
    inboundNotes,
    outboundNotes,
    corruptedNotes,
    cleanNotes,
  };
}

export function formatPlaceholderInventory(inventory: PlaceholderNotesInventory): string {
  return [
    `apple_rows=${inventory.appleRows}`,
    `empty_notes=${inventory.emptyNotes}`,
    `inbound_or_outbound_notes=${inventory.inboundNotes + inventory.outboundNotes}`,
    `inbound_notes=${inventory.inboundNotes}`,
    `outbound_notes=${inventory.outboundNotes}`,
    `corrupted_notes=${inventory.corruptedNotes}`,
    `clean_notes=${inventory.cleanNotes}`,
  ].join(" ");
}

export async function fetchCurrentTeamPersonIdsFromClient(
  client: RepairSupabaseClient,
): Promise<Set<string>> {
  const { matchSetsFromProductionRows } = await import("./recruits");
  const { data, error } = await client
    .from("production_people")
    .select(
      "id, first_name, last_name, preferred_name, cell_phone, personal_email, denison_email, role:roles!role_id(key), status:statuses!status_id(key)",
    )
    .limit(5000);
  if (error) throw new Error(error.message);
  const sets = matchSetsFromProductionRows([], (data ?? []) as import("./recruits").PersonRow[]);
  return new Set(sets.currentTeam.map((row) => row.id));
}

export function formatRepairCounts(counts: RepairCounts, applied: boolean): string {
  return [
    `repair eligible=${counts.eligible}`,
    `corrupted_candidates=${counts.corruptedCandidates}`,
    `placeholder_candidates=${counts.placeholderCandidates}`,
    `decoded=${counts.decoded}`,
    `decoded_from_text=${counts.decodedFromText}`,
    `decoded_from_attributed_body=${counts.decodedFromAttributedBody}`,
    `attachment_only=${counts.attachmentOnly}`,
    `decode_failed=${counts.stillDecodeFailed}`,
    `missing_local_guid=${counts.missingLocalGuid}`,
    `would_update=${counts.wouldUpdate}`,
    `current_team_skipped=${counts.currentTeamSkipped}`,
    applied ? `updated=${counts.updated}` : "applied=false",
  ].join(" ");
}
