/**
 * BP-026A / BP-026B — People field ownership (system of record).
 *
 * Denison Tennis OS (Supabase `production_people`) is the permanent system of
 * record after the initial import. External tools (currently Airtable CSV)
 * are **import sources only** — never long-term owners.
 *
 * Rules:
 * 1. Runtime edits in Tennis OS are authoritative.
 * 2. Normal import/seed fills NULL / missing values only (`coalesce(existing, excluded)`).
 * 3. Overwriting an existing Supabase value requires an explicit
 *    **Force Refresh From Provider** operation.
 * 4. Application-authoritative columns are never force-refreshed from import
 *    snapshots (ratings, notes, relationships, etc.).
 *
 * Designed so Airtable can be removed without changing the domain model.
 * Keep in sync with `docs/DATA_OWNERSHIP.md` and `docs/SYSTEM_OF_RECORD.md`.
 */

/**
 * Columns an import provider may supply.
 * - Normal seed: fill only when the live row is NULL.
 * - Force refresh: hard-replace from the provider snapshot (including NULL).
 */
export const PROVIDER_IMPORT_COLUMNS = [
  "role_id",
  "status_id",
  "title",
  "first_name",
  "middle_name",
  "last_name",
  "date_of_birth",
  "cell_phone",
  "personal_email",
  "denison_email",
  "city",
  "state",
  "country",
  "class_year",
  "major",
  "minor",
  "denison_id",
] as const;

/**
 * Columns Tennis OS owns after first write. Import/seed may fill NULLs on
 * insert/conflict, but Force Refresh must never overwrite them from a
 * provider snapshot (CSV often has no column → would wipe to NULL).
 */
export const APP_AUTHORITATIVE_COLUMNS = [
  "utr",
  "wtn",
  "notes",
  "dominant_hand",
  "height_inches",
  "weight_lbs",
  "player_status",
  "preferred_name",
  "photo_url",
  "preferred_contact_method",
  "address_line1",
  "address_line2",
  "zip_code",
  "dorm",
  "room_number",
  "relationships",
  "created_at",
] as const;

/**
 * @deprecated Use `PROVIDER_IMPORT_COLUMNS`. Alias kept for older call sites.
 */
export const EXTERNAL_SYNC_COLUMNS = PROVIDER_IMPORT_COLUMNS;

/**
 * @deprecated Use `PROVIDER_IMPORT_COLUMNS`.
 */
export const AIRTABLE_OWNED_COLUMNS = PROVIDER_IMPORT_COLUMNS;

/**
 * @deprecated Use `APP_AUTHORITATIVE_COLUMNS`.
 */
export const APP_OWNED_COLUMNS = APP_AUTHORITATIVE_COLUMNS;

export type ProviderImportColumn = (typeof PROVIDER_IMPORT_COLUMNS)[number];
/** @deprecated Use `ProviderImportColumn`. */
export type ExternalSyncColumn = ProviderImportColumn;
/** @deprecated Use `ProviderImportColumn`. */
export type AirtableOwnedColumn = ProviderImportColumn;
export type AppAuthoritativeColumn = (typeof APP_AUTHORITATIVE_COLUMNS)[number];
/** @deprecated Use `AppAuthoritativeColumn`. */
export type AppOwnedColumn = AppAuthoritativeColumn;

/** Fill-missing-only assignment for a column on conflict. */
export function fillNullAssignment(column: string): string {
  return `${column} = coalesce(public.production_people.${column}, excluded.${column})`;
}

/** Hard replace from provider snapshot on conflict (Force Refresh). */
export function forceRefreshAssignment(column: string): string {
  return `${column} = excluded.${column}`;
}
