/**
 * Lookup repository (BP-025A).
 * Sole sanctioned read path for roles / statuses tables.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { LookupRecord } from "./types";

export class LookupRepositoryError extends Error {}

type LookupRow = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  active: boolean;
};

function rowToLookup(row: LookupRow): LookupRecord {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    sortOrder: row.sort_order,
    active: row.active,
  };
}

async function listLookupTable(table: "roles" | "statuses"): Promise<LookupRecord[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from(table)
    .select("id, key, label, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new LookupRepositoryError(`Failed to load ${table}: ${error.message}`);
  }

  return ((data ?? []) as LookupRow[]).map(rowToLookup);
}

export function listRoles(): Promise<LookupRecord[]> {
  return listLookupTable("roles");
}

export function listStatuses(): Promise<LookupRecord[]> {
  return listLookupTable("statuses");
}
