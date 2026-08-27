import { RECRUITING_LOG_ROUTE } from "@/lib/module-routes";

import { DEFAULT_CHANGE_LOG_PERIOD, parseChangeLogPeriod, type ChangeLogPeriod } from "./period";
import {
  CHANGE_LOG_CATEGORY_FILTERS,
  CHANGE_LOG_PAGE_SIZE,
  CHANGE_LOG_SOURCE_FILTERS,
  type ChangeLogCategoryFilter,
  type ChangeLogSourceFilter,
} from "./types";

export type ChangeLogFilterState = {
  period: ChangeLogPeriod;
  category: ChangeLogCategoryFilter;
  query: string;
  recruitPersonId: string;
  source: ChangeLogSourceFilter;
  offset: number;
};

export function parseChangeLogCategory(raw: string | null | undefined): ChangeLogCategoryFilter {
  if (raw && (CHANGE_LOG_CATEGORY_FILTERS as readonly string[]).includes(raw)) {
    return raw as ChangeLogCategoryFilter;
  }
  return "all";
}

export function parseChangeLogSource(raw: string | null | undefined): ChangeLogSourceFilter {
  if (raw && (CHANGE_LOG_SOURCE_FILTERS as readonly string[]).includes(raw)) {
    return raw as ChangeLogSourceFilter;
  }
  return "all";
}

export function parseChangeLogOffset(raw: string | null | undefined): number {
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value / CHANGE_LOG_PAGE_SIZE) * CHANGE_LOG_PAGE_SIZE;
}

export function parseChangeLogFilters(params: {
  period?: string | null;
  category?: string | null;
  q?: string | null;
  recruit?: string | null;
  source?: string | null;
  offset?: string | null;
}): ChangeLogFilterState {
  return {
    period: parseChangeLogPeriod(params.period),
    category: parseChangeLogCategory(params.category),
    query: params.q?.trim() ?? "",
    recruitPersonId: params.recruit?.trim() ?? "",
    source: parseChangeLogSource(params.source),
    offset: parseChangeLogOffset(params.offset),
  };
}

export function changeLogPageHref(state: ChangeLogFilterState): string {
  const params = new URLSearchParams();
  if (state.period !== DEFAULT_CHANGE_LOG_PERIOD) params.set("period", state.period);
  if (state.category !== "all") params.set("category", state.category);
  if (state.query.trim()) params.set("q", state.query.trim());
  if (state.recruitPersonId) params.set("recruit", state.recruitPersonId);
  if (state.source !== "all") params.set("source", state.source);
  if (state.offset > 0) params.set("offset", String(state.offset));
  const suffix = params.toString();
  return suffix ? `${RECRUITING_LOG_ROUTE}?${suffix}` : RECRUITING_LOG_ROUTE;
}

export function changeLogFiltersAreDefault(state: ChangeLogFilterState): boolean {
  return (
    state.period === DEFAULT_CHANGE_LOG_PERIOD &&
    state.category === "all" &&
    state.query.trim() === "" &&
    state.recruitPersonId === "" &&
    state.source === "all"
  );
}
