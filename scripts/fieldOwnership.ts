/**
 * BP-022E / BP-023A — Field ownership for People sync.
 *
 * Denison Tennis OS is the system of record. External tools (currently the
 * Airtable CSV bootstrap) are synchronization sources. Seed & import may
 * update provider-synced columns only. Application-owned columns are never
 * overwritten by seed re-apply (`ON CONFLICT DO UPDATE` omits them).
 *
 * A full `db:reset` still replaces the entire database — intentional and
 * destructive.
 *
 * Keep in sync with `docs/DATA_OWNERSHIP.md` and `docs/SYSTEM_OF_RECORD.md`.
 */

/**
 * Columns written/updated from the current external People sync provider
 * (Airtable CSV → data.ts → seed.sql). Not permanent architectural owners.
 */
export const EXTERNAL_SYNC_COLUMNS = [
  "status",
  "roles",
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
  "updated_at",
] as const;

/**
 * @deprecated Use `EXTERNAL_SYNC_COLUMNS`. Alias kept for call-site clarity
 * during the Airtable bootstrap phase.
 */
export const AIRTABLE_OWNED_COLUMNS = EXTERNAL_SYNC_COLUMNS;

/**
 * Columns the application owns. Seed INSERT may set initial values on a
 * fresh row; ON CONFLICT must never overwrite existing values.
 */
export const APP_OWNED_COLUMNS = [
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

export type ExternalSyncColumn = (typeof EXTERNAL_SYNC_COLUMNS)[number];
/** @deprecated Use `ExternalSyncColumn`. */
export type AirtableOwnedColumn = ExternalSyncColumn;
export type AppOwnedColumn = (typeof APP_OWNED_COLUMNS)[number];
