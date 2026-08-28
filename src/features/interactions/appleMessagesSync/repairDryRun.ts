import { existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { SqliteMessagesCatalog } from "./catalog";
import { readHelperConfigFile, supabaseHostFromUrl } from "./config";
import { helperConfigPath } from "./paths";
import { createProductionSupabaseClient } from "./liveRuntime";
import { copyChatDatabase } from "./messagesCopy";
import {
  applyBodyRepairUpdates,
  fetchAppleInteractionsForRepair,
  fetchCurrentTeamPersonIdsFromClient,
  parseRepairFlags,
  placeholderNotesInventory,
  planBodyRepair,
  type RepairCounts,
  type PlaceholderNotesInventory,
  type RepairInteractionRow,
  type RepairPlanRow,
} from "./repairEmptyBodies";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppleScanRow } from "./scan";

export type RepairDryRunResult = {
  inventory: PlaceholderNotesInventory;
  counts: RepairCounts;
};

export type RepairApplyResult = {
  updated: number;
  failures: number;
  applied: true;
};

type RepairPlanContext = {
  client: SupabaseClient;
  inventory: PlaceholderNotesInventory;
  counts: RepairCounts;
  plans: RepairPlanRow[];
  rows: RepairInteractionRow[];
  rowsById: Map<string, RepairInteractionRow>;
  currentTeamPersonIds: Set<string>;
};

async function prepareBodyRepairPlan(input: {
  home: string;
  chatDb?: string;
}): Promise<RepairPlanContext> {
  const client = createProductionSupabaseClient(input.home);
  const rows = await fetchAppleInteractionsForRepair(client);
  const currentTeamPersonIds = await fetchCurrentTeamPersonIdsFromClient(client);

  const sourceDb = input.chatDb ?? join(homedir(), "Library/Messages/chat.db");
  if (!existsSync(sourceDb)) {
    throw new Error("messages_copy_failed");
  }

  const localByGuid = new Map<string, AppleScanRow>();
  const copyDir = mkdtempSync(join(tmpdir(), "apple-messages-repair-"));
  let copied: string;
  try {
    copied = copyChatDatabase(sourceDb, copyDir);
  } catch {
    throw new Error("messages_copy_failed");
  }

  const catalog = SqliteMessagesCatalog.open(copied);
  try {
    for (const row of rows) {
      const guid = row.sourceKey?.trim();
      if (!guid) continue;
      const local = catalog.messageByGuid(guid);
      if (local) localByGuid.set(guid, local);
    }
  } finally {
    catalog.close();
  }

  const { counts, plans } = planBodyRepair(rows, localByGuid, currentTeamPersonIds);
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return {
    client,
    inventory: placeholderNotesInventory(rows),
    counts,
    plans,
    rows,
    rowsById,
    currentTeamPersonIds,
  };
}

export async function runRepairEmptyBodiesDryRun(input: {
  home: string;
  chatDb?: string;
  argv?: string[];
}): Promise<RepairDryRunResult> {
  const flags = parseRepairFlags(input.argv ?? ["--repair-empty-bodies"]);
  if (flags.applyProduction) {
    throw new Error("Refusing production body repair dry-run with apply flags. Use apply mode.");
  }

  const { inventory, counts } = await prepareBodyRepairPlan(input);
  return { inventory, counts };
}

export async function runRepairEmptyBodiesApply(input: {
  home: string;
  chatDb?: string;
  argv?: string[];
}): Promise<{ apply: RepairApplyResult; verify: RepairDryRunResult }> {
  const flags = parseRepairFlags(input.argv ?? ["--repair-empty-bodies"]);
  if (!flags.applyProduction || !flags.confirmProduction) {
    throw new Error("Refusing production body repair without --apply-production --confirm-production-body-repair.");
  }

  const config = readHelperConfigFile(helperConfigPath(input.home));
  const host = supabaseHostFromUrl(config.supabaseUrl);
  const context = await prepareBodyRepairPlan(input);

  const { updated, failures } = await applyBodyRepairUpdates(
    context.client,
    context.plans,
    context.rowsById,
    context.currentTeamPersonIds,
    {
      applyProduction: flags.applyProduction,
      confirmProduction: flags.confirmProduction,
      host,
    },
  );

  const verify = await runRepairEmptyBodiesDryRun({
    home: input.home,
    chatDb: input.chatDb,
  });

  return {
    apply: { updated, failures, applied: true },
    verify,
  };
}

export function formatRepairApplySummary(apply: RepairApplyResult): string {
  return [
    `rows_updated=${apply.updated}`,
    `failures=${apply.failures}`,
    "applied=true",
  ].join("\n");
}

export function formatRepairVerificationSummary(result: RepairDryRunResult): string {
  const { counts } = result;
  return [
    `corrupted_candidates_remaining=${counts.corruptedCandidates}`,
    `would_update_remaining=${counts.wouldUpdate}`,
    `decode_failed_remaining=${counts.stillDecodeFailed}`,
    `current_team_skipped=${counts.currentTeamSkipped}`,
    "applied=false",
  ].join("\n");
}

export function formatRepairDryRunSummary(result: RepairDryRunResult): string {
  const { inventory, counts } = result;
  return [
    `apple_rows_inspected=${inventory.appleRows}`,
    `corrupted_candidates=${counts.corruptedCandidates}`,
    `clean_bodies_recovered=${counts.decoded}`,
    `attachment_only_recovered=${counts.attachmentOnly}`,
    `decode_failed=${counts.stillDecodeFailed}`,
    `missing_local_guid=${counts.missingLocalGuid}`,
    `current_team_skipped=${counts.currentTeamSkipped}`,
    `would_update=${counts.wouldUpdate}`,
    "applied=false",
  ].join("\n");
}
