import type { Person } from "../../src/features/people/types";
import {
  classYearFromClass,
  classifyEmail,
  mapStatusAndPlayerStatus,
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

export function isCoachRow(row: RawPlayerRow): boolean {
  return (row["Class"] ?? "").trim().toLowerCase() === "coach";
}

export function mapRowToPlayer(
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

  const { id, collided } = generateStableId(firstName, lastName, usedIds);
  if (collided) {
    warnings.push(`Generated id "${id}" — a player with the same name was already imported; suffixed to stay unique.`);
  }

  const { status, playerStatus, warning: statusWarning } = mapStatusAndPlayerStatus(
    row["Class"] ?? "",
    row["Status"] ?? "",
  );
  if (statusWarning) warnings.push(statusWarning);

  const classYear = classYearFromClass(row["Class"] ?? "");
  if (classYear === undefined && status === "current") {
    warnings.push(`Could not determine classYear from Class value "${row["Class"]}".`);
  }

  const dateOfBirth = parseUsDate(row["Date of Birth"] ?? "");
  if (!dateOfBirth && !isBlankValue(row["Date of Birth"])) {
    warnings.push(`Invalid Date of Birth value "${row["Date of Birth"]}" — could not parse, left blank.`);
  } else if (dateOfBirth) {
    const dobWarning = validateBirthDate(dateOfBirth, referenceDate);
    if (dobWarning) warnings.push(dobWarning);
  } else if (isBlankValue(row["Date of Birth"])) {
    warnings.push("Missing Date of Birth.");
  }

  const denisonId = normalizeDenisonId(row["D Number"] ?? "");
  if (!denisonId) warnings.push("Missing D Number (denisonId).");

  const { middleName, warning: middleNameWarning } = normalizeMiddleName(row["Middle Name"] ?? "");
  if (middleNameWarning) warnings.push(middleNameWarning);

  const { city, state, country, warning: locationWarning } = splitCityState(row["City, State"] ?? "");
  if (locationWarning) warnings.push(locationWarning);
  if (!city && !state && !country) warnings.push("Missing City, State.");

  const { major, minor, warning: majorWarning } = splitMajorMinor(row["Major"] ?? "");
  if (majorWarning) warnings.push(majorWarning);
  if (!major) warnings.push("Missing Major.");

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
    // System
    id,
    createdAt: timestamp,
    updatedAt: timestamp,

    // Identity
    status,
    firstName,
    middleName,
    lastName,
    preferredName: undefined,
    dateOfBirth,
    photoUrl: undefined,

    // Contact
    cellPhone,
    personalEmail,
    denisonEmail,
    preferredContactMethod: undefined,

    // Permanent Address
    addressLine1: undefined,
    addressLine2: undefined,
    city,
    state,
    zipCode: undefined,
    country,

    // Denison Information
    classYear,
    major,
    minor,
    denisonId,
    dorm: undefined,
    roomNumber: undefined,

    // Tennis Information
    utr,
    wtn,
    dominantHand: undefined,
    heightInches: undefined,
    weightLbs: undefined,
    playerStatus,

    // Relationships
    relationships: [],
  };

  return { person, warnings };
}

function isBlankValue(value: string | undefined): boolean {
  return !value || value.trim() === "";
}
