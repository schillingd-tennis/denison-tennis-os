/**
 * Complete tournament field inventory (CSV + DB + workspace).
 *
 * kind: user = editable business field; relational = join table;
 * system = id/timestamps/import key; derived = computed for display.
 */
export const TOURNAMENT_FIELD_INVENTORY = [
  { csv: "Tournament Name", db: "name", type: "text", imported: true, listed: true, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: "Level", db: "level", type: "text", imported: true, listed: true, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: "Open / Closed", db: "entry_type", type: "text", imported: true, listed: false, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: "Status", db: "lifecycle_status", type: "text", imported: true, listed: true, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: "Attended", db: "attended", type: "boolean", imported: true, listed: false, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: "Start Date", db: "start_date", type: "date", imported: true, listed: true, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: "End Date", db: "end_date", type: "date", imported: true, listed: true, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: "Surface", db: "surface", type: "text", imported: true, listed: false, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: "Tournament Page", db: "website_url", type: "url", imported: true, listed: false, displayed: true, editable: true, kind: "user", workspace: "links" },
  { csv: "City, State", db: "location", type: "text", imported: true, listed: true, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: "Distance from Columbus (mi)", db: "distance_from_columbus", type: "text", imported: true, listed: true, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: "Notes / Start Times", db: "notes", type: "text", imported: true, listed: false, displayed: true, editable: true, kind: "user", workspace: "links" },
  { csv: "Additional Notes", db: "additional_notes", type: "text", imported: true, listed: false, displayed: true, editable: true, kind: "user", workspace: "links" },
  { csv: "Recruits Attending", db: "recruits_attending_text", type: "text", imported: true, listed: false, displayed: true, editable: true, kind: "user", workspace: "players" },
  { csv: null, db: "recruiting_plan", type: "text", imported: true, listed: false, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: null, db: "status", type: "text", imported: true, listed: false, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: null, db: "venue", type: "text", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "overview" },
  { csv: null, db: "recruiting_tournament_recruits", type: "join", imported: false, listed: true, displayed: true, editable: true, kind: "relational", workspace: "players" },
  { csv: null, db: "id", type: "uuid", imported: false, listed: false, displayed: false, editable: false, kind: "system", workspace: "system" },
  { csv: null, db: "source_key", type: "text", imported: true, listed: false, displayed: false, editable: false, kind: "system", workspace: "system" },
  { csv: null, db: "created_at", type: "timestamptz", imported: false, listed: false, displayed: false, editable: false, kind: "system", workspace: "system" },
  { csv: null, db: "updated_at", type: "timestamptz", imported: false, listed: false, displayed: false, editable: false, kind: "system", workspace: "system" },
  { csv: null, db: "linked_recruit_count", type: "number", imported: false, listed: true, displayed: true, editable: false, kind: "derived", workspace: "players" },
  { csv: null, db: "estimated_drive_time", type: "text", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "travel_method", type: "text", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "departure_date", type: "date", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "return_date", type: "date", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "hotel_name", type: "text", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "hotel_address", type: "text", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "hotel_confirmation", type: "text", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "hotel_check_in", type: "date", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "hotel_check_out", type: "date", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "airport", type: "text", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "flight_info", type: "text", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "rental_car", type: "text", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "travel" },
  { csv: null, db: "draws_url", type: "url", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "links" },
  { csv: null, db: "usta_url", type: "url", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "links" },
  { csv: null, db: "schedule_url", type: "url", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "links" },
  { csv: null, db: "results_url", type: "url", imported: false, listed: false, displayed: true, editable: true, kind: "user", workspace: "links" },
] as const;

/** Requested product fields that are not in the Coda/CSV export or schema. */
export const TOURNAMENT_FIELDS_NOT_IN_CSV = [
  "Gender / division",
  "Age group",
  "Registration / entry deadline",
  "Organizer",
  "Tournament director",
  "Assigned coach",
] as const;
