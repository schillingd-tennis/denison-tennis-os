/**
 * BP-029A — People field ownership (system of record lock).
 *
 * STATUS: COMPLETED / BASELINE (accepted 2026-08-06). Not an active work item.
 * Do not change these rules unless a bug is discovered.
 *
 * Supabase `production_people` is the permanent system of record.
 * Airtable (CSV) is an **import / bootstrap source only**.
 *
 * After a Person exists in Supabase (or a field is non-NULL), Denison Tennis
 * OS owns that data. Normal import/seed may create missing rows and fill
 * NULL columns only — never overwrite populated values, never blank-wipe.
 *
 * Rules:
 * 1. Runtime edits write only to Supabase and are authoritative.
 * 2. Normal import/seed: `coalesce(existing, excluded)` — fill missing only.
 * 3. Airtable Force Refresh hard-replace is **disabled** (BP-029A).
 * 4. Future automated providers (UTR/WTN/TRN) may own only their scoped
 *    columns later — Airtable is never that class.
 *
 * Keep in sync with `docs/DATA_OWNERSHIP.md` and `docs/SYSTEM_OF_RECORD.md`.
 */

/**
 * Profile columns Airtable/bootstrap may supply on INSERT or when the live
 * column is NULL. Immediately afterward they are OS Managed — imports must
 * never overwrite a populated value.
 *
 * Includes former “provider-import” and “app-authoritative” profile fields.
 * `created_at` is listed separately for fill-null on conflict only.
 */
export const IMPORTED_ONCE_COLUMNS = [
  "role_id",
  "status_id",
  "title",
  "first_name",
  "middle_name",
  "last_name",
  "preferred_name",
  "date_of_birth",
  "photo_url",
  "cell_phone",
  "personal_email",
  "denison_email",
  "preferred_contact_method",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "zip_code",
  "country",
  "class_year",
  "major",
  "minor",
  "denison_id",
  "dorm",
  "room_number",
  "utr",
  "wtn",
  "dominant_hand",
  "height_inches",
  "weight_lbs",
  "player_status",
  "relationships",
  "notes",
] as const;

/**
 * Columns OS owns after bootstrap. Same set as Imported Once for Person
 * profile data; seed may fill NULLs but never force-replace from Airtable.
 */
export const OS_MANAGED_COLUMNS = IMPORTED_ONCE_COLUMNS;

/**
 * Reserved for future automated integrations (UTR API, WTN API, TRN, …).
 * Empty in BP-029A — Airtable must not be added here.
 */
export const FUTURE_PROVIDER_MANAGED_COLUMNS = [] as const;

/**
 * System columns filled on insert; `created_at` may fill-null on conflict
 * but is never overwritten by import snapshots once set.
 */
export const SYSTEM_FILL_NULL_COLUMNS = ["created_at"] as const;

/**
 * @deprecated BP-029A — Airtable has no continuing import-overwrite columns.
 * Alias kept so older call sites compile; equals IMPORTED_ONCE_COLUMNS for
 * fill-null generation only. Do not use for hard-replace.
 */
export const PROVIDER_IMPORT_COLUMNS = IMPORTED_ONCE_COLUMNS;

/**
 * @deprecated BP-029A — use OS_MANAGED_COLUMNS / IMPORTED_ONCE_COLUMNS.
 * Previously meant “never force-refreshed”; now all profile fields are OS-owned.
 */
export const APP_AUTHORITATIVE_COLUMNS = [
  ...IMPORTED_ONCE_COLUMNS,
  ...SYSTEM_FILL_NULL_COLUMNS,
] as const;

/**
 * @deprecated Use `IMPORTED_ONCE_COLUMNS` (fill-null only; never hard-replace).
 */
export const EXTERNAL_SYNC_COLUMNS = IMPORTED_ONCE_COLUMNS;

/**
 * @deprecated Airtable does not own columns after bootstrap (BP-029A).
 */
export const AIRTABLE_OWNED_COLUMNS = IMPORTED_ONCE_COLUMNS;

/**
 * @deprecated Use `OS_MANAGED_COLUMNS`.
 */
export const APP_OWNED_COLUMNS = OS_MANAGED_COLUMNS;

export type ImportedOnceColumn = (typeof IMPORTED_ONCE_COLUMNS)[number];
export type OsManagedColumn = (typeof OS_MANAGED_COLUMNS)[number];
/** @deprecated */
export type ProviderImportColumn = ImportedOnceColumn;
/** @deprecated */
export type ExternalSyncColumn = ImportedOnceColumn;
/** @deprecated */
export type AirtableOwnedColumn = ImportedOnceColumn;
/** @deprecated */
export type AppAuthoritativeColumn = (typeof APP_AUTHORITATIVE_COLUMNS)[number];
/** @deprecated */
export type AppOwnedColumn = OsManagedColumn;

/**
 * Fill-missing-only assignment. Existing non-NULL Supabase values always win.
 * Empty-string incoming values do not clear a populated column (`coalesce`
 * only skips SQL NULL; populated text is preserved either way).
 */
export function fillNullAssignment(column: string): string {
  return `${column} = coalesce(public.production_people.${column}, excluded.${column})`;
}

/**
 * Columns that participate in normal seed ON CONFLICT fill-null updates.
 * Does not include `id` or `updated_at` (edit timestamps preserved).
 */
export function fillNullConflictColumns(): readonly string[] {
  return [...IMPORTED_ONCE_COLUMNS, ...SYSTEM_FILL_NULL_COLUMNS];
}

/**
 * @deprecated BP-029A — Airtable hard-replace is disabled. Kept only so
 * accidental call sites fail closed via `assertForceRefreshDisabled`.
 */
export function forceRefreshAssignment(column: string): string {
  return `${column} = excluded.${column}`;
}

/** BP-029A — routine / CLI Force Refresh from Airtable must not run. */
export const FORCE_REFRESH_DISABLED_MESSAGE = [
  "BP-029A — Force Refresh From Airtable is disabled.",
  "Supabase is the permanent system of record. Airtable may only create missing",
  "People and fill NULL fields (npm run db:seed).",
  "Hard-replacing populated SoR fields from Airtable is not part of normal operations.",
  "Use db:reset only when you intentionally wipe the local database.",
].join(" ");

export function assertForceRefreshDisabled(): never {
  throw new Error(FORCE_REFRESH_DISABLED_MESSAGE);
}
