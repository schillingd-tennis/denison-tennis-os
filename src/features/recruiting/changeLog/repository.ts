import { createSupabaseServerClient } from "@/lib/supabase/server";

import { changeLogMatchesQuery } from "./display";
import { parseChangeLogFilters, type ChangeLogFilterState } from "./filters";
import { rangeForPeriod } from "./period";
import {
  CHANGE_LOG_CATEGORIES,
  CHANGE_LOG_DASHBOARD_LIMIT,
  CHANGE_LOG_EVENT_TYPES,
  CHANGE_LOG_PAGE_SIZE,
  CHANGE_LOG_SOURCES,
  type ChangeLogCategory,
  type ChangeLogEvent,
  type ChangeLogEventType,
  type ChangeLogSource,
} from "./types";

type PersonNameRow = {
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
};

type ChangeLogRow = {
  id: string;
  recruit_person_id: string;
  event_type: string;
  category: string;
  field_key: string | null;
  field_label: string | null;
  old_value: unknown;
  new_value: unknown;
  summary: string;
  source: string;
  actor_user_id: string | null;
  occurred_at: string;
  created_at: string;
  person?: PersonNameRow | PersonNameRow[] | null;
};

const SELECT = `
  id,
  recruit_person_id,
  event_type,
  category,
  field_key,
  field_label,
  old_value,
  new_value,
  summary,
  source,
  actor_user_id,
  occurred_at,
  created_at,
  person:production_people!recruit_person_id ( first_name, last_name, preferred_name )
`;

function personName(person: ChangeLogRow["person"]): string {
  const row = Array.isArray(person) ? person[0] : person;
  const first = row?.preferred_name?.trim() || row?.first_name?.trim() || "Unknown";
  const last = row?.last_name?.trim() || "recruit";
  return `${first} ${last}`.trim();
}

function asCategory(value: string): ChangeLogCategory {
  return (CHANGE_LOG_CATEGORIES as readonly string[]).includes(value)
    ? (value as ChangeLogCategory)
    : "system";
}

function asEventType(value: string): ChangeLogEventType {
  return (CHANGE_LOG_EVENT_TYPES as readonly string[]).includes(value)
    ? (value as ChangeLogEventType)
    : "field_updated";
}

function asSource(value: string): ChangeLogSource {
  return (CHANGE_LOG_SOURCES as readonly string[]).includes(value)
    ? (value as ChangeLogSource)
    : "unknown";
}

function mapRow(row: ChangeLogRow): ChangeLogEvent {
  return {
    id: row.id,
    recruitPersonId: row.recruit_person_id,
    recruitName: personName(row.person),
    eventType: asEventType(row.event_type),
    category: asCategory(row.category),
    fieldKey: row.field_key,
    fieldLabel: row.field_label,
    oldValue: row.old_value,
    newValue: row.new_value,
    summary: row.summary,
    source: asSource(row.source),
    actorUserId: row.actor_user_id,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

function missingTable(message: string): boolean {
  return /does not exist|schema cache|could not find/i.test(message);
}

function applyRange(
  query: { gte: (column: string, value: string) => unknown; lt: (column: string, value: string) => unknown; lte: (column: string, value: string) => unknown },
  period: ChangeLogFilterState["period"],
  now: Date,
) {
  const range = rangeForPeriod(period, now);
  if (range.startMs != null) query.gte("occurred_at", new Date(range.startMs).toISOString());
  if (range.endMs == null) return;
  if (period === "yesterday") query.lt("occurred_at", new Date(range.endMs).toISOString());
  else query.lte("occurred_at", new Date(range.endMs).toISOString());
}

export async function listRecruitChangeLogForPerson(
  personId: string,
  limit = 200,
): Promise<ChangeLogEvent[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("recruit_change_log")
    .select(SELECT)
    .eq("recruit_person_id", personId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Failed to load recruit change log: ${error.message}`);
  }
  return ((data ?? []) as unknown as ChangeLogRow[]).map(mapRow);
}

export async function listRecentRecruitChangeLog(
  limit = CHANGE_LOG_DASHBOARD_LIMIT,
): Promise<ChangeLogEvent[]> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("recruit_change_log")
    .select(SELECT)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Failed to load recent recruiting updates: ${error.message}`);
  }
  return ((data ?? []) as unknown as ChangeLogRow[]).map(mapRow);
}

export async function listCentralRecruitChangeLog(
  filters: ChangeLogFilterState,
  now = new Date(),
): Promise<{ events: ChangeLogEvent[]; hasMore: boolean }> {
  const client = await createSupabaseServerClient();
  const fetchLimit = CHANGE_LOG_PAGE_SIZE + 1;
  let query = client
    .from("recruit_change_log")
    .select(SELECT)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .range(filters.offset, filters.offset + fetchLimit - 1);
  applyRange(query, filters.period, now);
  if (filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.source !== "all") query = query.eq("source", filters.source);
  if (filters.recruitPersonId) query = query.eq("recruit_person_id", filters.recruitPersonId);
  if (filters.query) {
    const pattern = `%${filters.query.replace(/[%_,]/g, " ").trim()}%`;
    query = query.or(
      `summary.ilike.${pattern},field_label.ilike.${pattern},event_type.ilike.${pattern}`,
    );
  }
  const { data, error } = await query;
  if (error) {
    if (missingTable(error.message)) return { events: [], hasMore: false };
    throw new Error(`Failed to load recruiting log: ${error.message}`);
  }
  const mapped = ((data ?? []) as unknown as ChangeLogRow[]).map(mapRow);
  const matched = filters.query
    ? mapped.filter((event) => changeLogMatchesQuery(event, filters.query))
    : mapped;
  return {
    events: matched.slice(0, CHANGE_LOG_PAGE_SIZE),
    hasMore: mapped.length > CHANGE_LOG_PAGE_SIZE,
  };
}

export async function listChangeLogForSummaries(
  filters: Pick<ChangeLogFilterState, "period" | "category" | "query" | "recruitPersonId" | "source">,
  now = new Date(),
  limit = 2000,
): Promise<ChangeLogEvent[]> {
  const client = await createSupabaseServerClient();
  let query = client
    .from("recruit_change_log")
    .select(SELECT)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  applyRange(query, filters.period, now);
  if (filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.source !== "all") query = query.eq("source", filters.source);
  if (filters.recruitPersonId) query = query.eq("recruit_person_id", filters.recruitPersonId);
  const { data, error } = await query;
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Failed to load recruiting log summaries: ${error.message}`);
  }
  const mapped = ((data ?? []) as unknown as ChangeLogRow[]).map(mapRow);
  return filters.query ? mapped.filter((event) => changeLogMatchesQuery(event, filters.query)) : mapped;
}

export function parseChangeLogSearchParams(searchParams: {
  period?: string | string[];
  category?: string | string[];
  q?: string | string[];
  recruit?: string | string[];
  source?: string | string[];
  offset?: string | string[];
}): ChangeLogFilterState {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return parseChangeLogFilters({
    period: first(searchParams.period),
    category: first(searchParams.category),
    q: first(searchParams.q),
    recruit: first(searchParams.recruit),
    source: first(searchParams.source),
    offset: first(searchParams.offset),
  });
}

export { occurredInRange } from "./period";
