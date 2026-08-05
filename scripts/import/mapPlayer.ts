import { STATUS_KEYS } from "../../src/features/lookups/seed";
import { personLookupsFromKeys } from "../../src/features/people/supabaseMapping";
import type { Person } from "../../src/features/people/types";
import {
  classYearFromClass,
  classifyEmail,
  classifyPersonRow,
  normalizeDenisonId,
  normalizeMiddleName,
  normalizePhone,
  parseLastModified,
  parseUsDate,
  resolveNames,
  splitCityState,
  splitMajorMinor,
  validateBirthDate,
  validateUtr,
  validateWtn,
} from "./normalize";
import { generateStableId } from "./stableId";
import type { MappedPlayer, RawPlayerRow } from "./types";

/** Columns this pipeline reads from directly (mapped or used for derivation). */
export const KNOWN_COLUMNS = [
  "Name",
  "Class",
  "Status",
  "Title",
  "Date of Birth",
  "D Number",
  "First Name",
  "Last Name",
  "City, State",
  "Email",
  "Phone",
  "Major",
  "Last Modified",
  "Middle Name",
];

/** Person fields this CSV export has no column for at all. */
export const FIELDS_WITH_NO_SOURCE_COLUMN = [
  "preferredName",
  "photoUrl",
  "preferredContactMethod",
  "addressLine1",
  "addressLine2",
  "zipCode",
  "dorm",
  "roomNumber",
  "utr",
  "wtn",
  "dominantHand",
  "heightInches",
  "weightLbs",
];

/**
 * Maps one People sync CSV row onto a Person (current source: Airtable
 * export). Handles players, coaches, staff, and alumni through the same
 * path using the Person Role model.
 */
export function mapRowToPerson(
  row: RawPlayerRow,
  usedIds: Set<string>,
  referenceDate: Date,
): MappedPlayer | { error: string } {
  const warnings: string[] = [];

  const { firstName, lastName, warnings: nameWarnings } = resolveNames(
    row["First Name"] ?? "",
    row["Last Name"] ?? "",
    row["Name"] ?? "",
  );
  warnings.push(...nameWarnings);

  if (!firstName || !lastName) {
    return { error: `Missing first and/or last name (Name column: "${row["Name"] ?? ""}").` };
  }

  const { id, collided, knownTitle } = generateStableId(firstName, lastName, usedIds);
  if (collided) {
    warnings.push(
      `Generated id "${id}" — a person with the same name was already imported; suffixed to stay unique (may merge later by name).`,
    );
  }

  const classification = classifyPersonRow(
    row["Class"] ?? "",
    row["Status"] ?? "",
    row["Title"],
  );
  if (classification.warning) warnings.push(classification.warning);

  const { statusKey, roleKey, playerStatus, isProgramRoleRow } = classification;
  // Reserved coaching titles for known people when sync CSV has no Title yet.
  const title =
    knownTitle && (!classification.title || classification.title === "Coach")
      ? knownTitle
      : classification.title;

  const classYear = classYearFromClass(row["Class"] ?? "");
  if (classYear === undefined && statusKey === STATUS_KEYS.current && !isProgramRoleRow) {
    warnings.push(`Could not determine classYear from Class value "${row["Class"]}".`);
  }

  const lookups = personLookupsFromKeys(roleKey, statusKey);

  const dateOfBirth = parseUsDate(row["Date of Birth"] ?? "");
  if (!dateOfBirth && !isBlankValue(row["Date of Birth"])) {
    warnings.push(`Invalid Date of Birth value "${row["Date of Birth"]}" — could not parse, left blank.`);
  } else if (dateOfBirth) {
    const dobWarning = validateBirthDate(dateOfBirth, referenceDate);
    if (dobWarning) warnings.push(dobWarning);
  } else if (isBlankValue(row["Date of Birth"]) && !isProgramRoleRow) {
    warnings.push("Missing Date of Birth.");
  }

  const denisonId = normalizeDenisonId(row["D Number"] ?? "");
  if (!denisonId && !isProgramRoleRow) warnings.push("Missing D Number (denisonId).");

  const { middleName, warning: middleNameWarning } = normalizeMiddleName(row["Middle Name"] ?? "");
  if (middleNameWarning) warnings.push(middleNameWarning);

  const { city, state, country, warning: locationWarning } = splitCityState(row["City, State"] ?? "");
  if (locationWarning) warnings.push(locationWarning);
  if (!city && !state && !country && !isProgramRoleRow) warnings.push("Missing City, State.");

  const { major, minor, warning: majorWarning } = splitMajorMinor(row["Major"] ?? "");
  if (majorWarning) warnings.push(majorWarning);
  if (!major && !isProgramRoleRow) warnings.push("Missing Major.");

  const { personalEmail, denisonEmail } = classifyEmail(row["Email"] ?? "");
  if (!personalEmail && !denisonEmail) warnings.push("Missing Email.");

  const cellPhone = normalizePhone(row["Phone"] ?? "");
  if (!cellPhone) warnings.push("Missing Phone.");

  const { utr, warning: utrWarning } = validateUtr(row["UTR"]);
  if (utrWarning) warnings.push(utrWarning);

  const { wtn, warning: wtnWarning } = validateWtn(row["WTN"]);
  if (wtnWarning) warnings.push(wtnWarning);

  const lastModified = parseLastModified(row["Last Modified"] ?? "");
  const timestamp = lastModified ?? referenceDate.toISOString();
  if (!lastModified) {
    warnings.push("Missing/unparseable Last Modified — used the import run timestamp instead.");
  }

  const person: Person = {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,

    ...lookups,
    title,
    firstName,
    middleName,
    lastName,
    preferredName: undefined,
    dateOfBirth,
    photoUrl: undefined,

    cellPhone,
    personalEmail,
    denisonEmail,
    preferredContactMethod: undefined,

    addressLine1: undefined,
    addressLine2: undefined,
    city,
    state,
    zipCode: undefined,
    country,

    classYear: isProgramRoleRow ? undefined : classYear,
    major,
    minor,
    denisonId,
    dorm: undefined,
    roomNumber: undefined,

    utr,
    wtn,
    dominantHand: undefined,
    heightInches: undefined,
    weightLbs: undefined,
    playerStatus,

    relationships: [],
  };

  return { person, warnings };
}

/** @deprecated Use `mapRowToPerson`. */
export const mapRowToPlayer = mapRowToPerson;

function isBlankValue(value: string | undefined): boolean {
  return !value || value.trim() === "";
}
