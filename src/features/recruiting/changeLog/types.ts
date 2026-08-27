export const CHANGE_LOG_CATEGORIES = [
  "profile",
  "rankings",
  "recruiting",
  "academics",
  "schools",
  "visits",
  "system",
] as const;

export type ChangeLogCategory = (typeof CHANGE_LOG_CATEGORIES)[number];

export const CHANGE_LOG_SOURCES = ["app", "import", "integration", "system", "unknown"] as const;
export type ChangeLogSource = (typeof CHANGE_LOG_SOURCES)[number];

export const CHANGE_LOG_EVENT_TYPES = ["recruit_created", "field_updated"] as const;
export type ChangeLogEventType = (typeof CHANGE_LOG_EVENT_TYPES)[number];

export type ChangeLogEvent = {
  id: string;
  recruitPersonId: string;
  recruitName: string;
  eventType: ChangeLogEventType;
  category: ChangeLogCategory;
  fieldKey: string | null;
  fieldLabel: string | null;
  oldValue: unknown;
  newValue: unknown;
  summary: string;
  source: ChangeLogSource;
  actorUserId: string | null;
  occurredAt: string;
  createdAt: string;
};

export const CHANGE_LOG_CATEGORY_FILTERS = [
  "all",
  "profile",
  "rankings",
  "recruiting",
  "academics",
  "schools",
  "visits",
  "system",
] as const;
export type ChangeLogCategoryFilter = (typeof CHANGE_LOG_CATEGORY_FILTERS)[number];

export const CHANGE_LOG_SOURCE_FILTERS = ["all", ...CHANGE_LOG_SOURCES] as const;
export type ChangeLogSourceFilter = (typeof CHANGE_LOG_SOURCE_FILTERS)[number];

export const CHANGE_LOG_PAGE_SIZE = 50;
export const CHANGE_LOG_DASHBOARD_LIMIT = 5;
