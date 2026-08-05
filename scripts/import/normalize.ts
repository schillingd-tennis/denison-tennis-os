import type { PersonRole, PersonStatus, PlayerStatus } from "../../src/features/people/types";

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]);

/**
 * The CSV encodes class standing (Freshman/Sophomore/Junior/Senior) rather
 * than a graduation year. This anchors that standing to an actual
 * graduation year — bump it by one at the start of each new academic year.
 */
export const CURRENT_SENIOR_CLASS_YEAR = 2027;

const PLAYER_STANDINGS = new Set(["freshman", "sophomore", "junior", "senior"]);

function isBlank(value: string | undefined): boolean {
  return !value || value.trim() === "" || value.trim().toUpperCase() === "NA";
}

/** Title-cases an Airtable Class / Title value (e.g. "head coach" → "Head Coach"). */
export function titleCaseLabel(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function classYearFromClass(classValue: string): number | undefined {
  switch (classValue.trim().toLowerCase()) {
    case "senior":
      return CURRENT_SENIOR_CLASS_YEAR;
    case "junior":
      return CURRENT_SENIOR_CLASS_YEAR + 1;
    case "sophomore":
      return CURRENT_SENIOR_CLASS_YEAR + 2;
    case "freshman":
      return CURRENT_SENIOR_CLASS_YEAR + 3;
    default:
      return undefined;
  }
}

export type PersonClassification = {
  status: PersonStatus;
  playerStatus?: PlayerStatus;
  roles: PersonRole[];
  /** Display title when Airtable provides one (Title column or non-standing Class). */
  title?: string;
  /** True when this row is a non-player program role (coach/staff/etc.). */
  isProgramRoleRow: boolean;
  warning?: string;
};

/**
 * Maps Airtable Class + Status (+ optional Title) onto Person status, roles,
 * and title. Coaches/staff get roles from Class — never from status alone.
 */
export function classifyPersonRow(
  classValue: string,
  statusValue: string,
  titleValue?: string,
): PersonClassification {
  const cls = classValue.trim().toLowerCase();
  const st = statusValue.trim().toLowerCase();
  const explicitTitle = titleValue?.trim() ? titleCaseLabel(titleValue) : undefined;

  if (cls === "archive") {
    return {
      status: "alumni",
      playerStatus: "graduated",
      roles: ["alumni"],
      title: explicitTitle,
      isProgramRoleRow: false,
    };
  }

  // Coaches — Class may be "Coach", "Head Coach", "Assistant Coach", etc.
  if (cls === "coach" || cls.includes("coach")) {
    const isAlumni = st === "alumni";
    return {
      status: isAlumni ? "alumni" : "current",
      playerStatus: isAlumni ? "graduated" : undefined,
      roles: isAlumni ? ["alumni", "coach"] : ["coach"],
      title: explicitTitle ?? titleCaseLabel(classValue || "Coach"),
      isProgramRoleRow: true,
      warning:
        st === "other"
          ? `Status "Other" on coach row — kept as current coach; verify manually.`
          : undefined,
    };
  }

  // Staff and other program roles (Athletic Trainer, Team Manager, Volunteer, …).
  if (
    cls === "staff" ||
    cls.includes("staff") ||
    cls.includes("trainer") ||
    cls.includes("manager") ||
    cls.includes("volunteer")
  ) {
    return {
      status: "current",
      playerStatus: undefined,
      roles: ["staff"],
      title: explicitTitle ?? titleCaseLabel(classValue || "Staff"),
      isProgramRoleRow: true,
    };
  }

  if (st === "alumni") {
    return {
      status: "alumni",
      playerStatus: "graduated",
      roles: ["alumni"],
      title: explicitTitle,
      isProgramRoleRow: false,
    };
  }

  if (st === "other") {
    return {
      status: "current",
      playerStatus: "inactive",
      roles: ["player"],
      title: explicitTitle,
      isProgramRoleRow: false,
      warning: `Status "Other" mapped to playerStatus "inactive" — verify manually.`,
    };
  }

  if (st === "") {
    return {
      status: "current",
      playerStatus: "active",
      roles: ["player"],
      title: explicitTitle,
      isProgramRoleRow: false,
      warning: `Status column was blank — defaulted to status "current" / playerStatus "active".`,
    };
  }

  if (st === "current" || PLAYER_STANDINGS.has(cls)) {
    return {
      status: "current",
      playerStatus: "active",
      roles: ["player"],
      title: explicitTitle,
      isProgramRoleRow: false,
      warning:
        st !== "current"
          ? `Unrecognized Status value "${statusValue}" — defaulted to status "current" / playerStatus "active".`
          : undefined,
    };
  }

  return {
    status: "current",
    playerStatus: "active",
    roles: ["player"],
    title: explicitTitle ?? (classValue.trim() ? titleCaseLabel(classValue) : undefined),
    isProgramRoleRow: false,
    warning: `Unrecognized Class/Status ("${classValue}" / "${statusValue}") — defaulted to player; verify manually.`,
  };
}

/** @deprecated Prefer `classifyPersonRow`. */
export function mapStatusAndPlayerStatus(
  classValue: string,
  statusValue: string,
): { status: PersonStatus; playerStatus: PlayerStatus; warning?: string } {
  const mapped = classifyPersonRow(classValue, statusValue);
  return {
    status: mapped.status,
    playerStatus: mapped.playerStatus ?? (mapped.status === "alumni" ? "graduated" : "active"),
    warning: mapped.warning,
  };
}

export function resolveNames(
  firstNameRaw: string,
  lastNameRaw: string,
  fullNameRaw: string,
): { firstName: string; lastName: string; warnings: string[] } {
  let firstName = firstNameRaw.trim();
  let lastName = lastNameRaw.trim();
  const fullName = fullNameRaw.trim();
  const warnings: string[] = [];

  if (!lastName && fullName) {
    const parts = fullName.split(/\s+/);
    if (parts.length > 1) {
      const derivedFirst = parts[0];
      const derivedLast = parts.slice(1).join(" ");
      if (!firstName) firstName = derivedFirst;
      lastName = derivedLast;
      warnings.push(
        `Last Name column was blank; derived "${derivedLast}" from the Name column ("${fullName}").`,
      );
    }
  }

  if (!firstName && fullName) {
    firstName = fullName.split(/\s+/)[0];
    warnings.push(
      `First Name column was blank; derived "${firstName}" from the Name column ("${fullName}").`,
    );
  }

  if (fullName) {
    const normalizedFull = fullName.replace(/\s+/g, " ").toLowerCase();
    const combined = `${firstName} ${lastName}`.replace(/\s+/g, " ").trim().toLowerCase();
    if (combined !== normalizedFull) {
      // The Name column and the First/Last Name columns disagree. When Name
      // starts with the same first name, the remainder is almost always the
      // correct surname and Last Name has the typo (observed repeatedly in
      // this export: transposed/dropped letters, e.g. "Bugler" vs "Bulger").
      // Prefer the Name-derived surname in that case, but always keep the
      // mismatch visible in the warning so it can be manually double-checked.
      const nameParts = fullName.split(/\s+/);
      const nameFirstWord = nameParts[0]?.toLowerCase();
      if (nameFirstWord === firstName.toLowerCase() && nameParts.length > 1) {
        const derivedLast = nameParts.slice(1).join(" ");
        warnings.push(
          `Last Name column ("${lastName}") disagreed with the Name column ("${fullName}"); used "${derivedLast}" from Name instead — please verify.`,
        );
        lastName = derivedLast;
      } else {
        warnings.push(
          `Name column ("${fullName}") does not match First/Last Name columns ("${firstName} ${lastName}") — verify for typos.`,
        );
      }
    }
  }

  return { firstName, lastName, warnings };
}

export function parseUsDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (isBlank(trimmed)) return undefined;

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return undefined;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealCalendarDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealCalendarDate) return undefined;

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function validateBirthDate(iso: string | undefined, referenceDate: Date): string | undefined {
  if (!iso) return undefined;
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (date.getTime() > referenceDate.getTime()) {
    return `Date of Birth "${iso}" is in the future.`;
  }
  const ageYears = (referenceDate.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears > 100 || ageYears < 14) {
    return `Date of Birth "${iso}" produces an implausible age (${ageYears.toFixed(1)} years).`;
  }
  return undefined;
}

export function parseLastModified(value: string): string | undefined {
  const trimmed = value.trim();
  if (isBlank(trimmed)) return undefined;

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return undefined;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const rawHour = Number(match[4]);
  const minute = Number(match[5]);
  const ampm = match[6].toLowerCase();

  let hour = rawHour % 12;
  if (ampm === "pm") hour += 12;

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString();
}

export function splitCityState(
  value: string,
): { city?: string; state?: string; country?: string; warning?: string } {
  const trimmed = value.trim();
  if (isBlank(trimmed)) return {};

  if (trimmed.includes(",")) {
    const [cityRaw, stateRaw] = trimmed.split(",").map((part) => part.trim());
    const stateUpper = (stateRaw ?? "").toUpperCase();
    if (US_STATE_CODES.has(stateUpper)) {
      return { city: cityRaw || undefined, state: stateUpper, country: "USA" };
    }
    return { city: cityRaw || undefined, country: stateRaw || undefined };
  }

  const upper = trimmed.toUpperCase();
  if (US_STATE_CODES.has(upper)) {
    return { state: upper, country: "USA" };
  }

  return {
    country: trimmed,
    warning: `Location value "${trimmed}" (City, State column) had no city; stored as country only.`,
  };
}

export function splitMajorMinor(
  value: string,
): { major?: string; minor?: string; warning?: string } {
  const trimmed = value.trim();
  if (isBlank(trimmed)) return {};

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) return { major: parts[0] };

  const minor = parts.slice(1).join(", ");
  return {
    major: parts[0],
    minor,
    warning: `Major column had multiple values ("${trimmed}"); stored "${parts[0]}" as major and "${minor}" as minor — this may actually be a double major, not a minor.`,
  };
}

export function classifyEmail(value: string): { personalEmail?: string; denisonEmail?: string } {
  const trimmed = value.trim();
  if (isBlank(trimmed)) return {};
  if (/@denison\.edu$/i.test(trimmed)) return { denisonEmail: trimmed };
  return { personalEmail: trimmed };
}

export function normalizePhone(value: string): string | undefined {
  const trimmed = value.trim();
  if (isBlank(trimmed)) return undefined;
  return trimmed;
}

export function normalizeDenisonId(value: string): string | undefined {
  const trimmed = value.trim();
  if (isBlank(trimmed)) return undefined;
  return trimmed;
}

export function normalizeMiddleName(value: string): { middleName?: string; warning?: string } {
  const trimmed = value.trim();
  if (isBlank(trimmed)) return {};
  if (trimmed.includes("(")) {
    return {
      middleName: trimmed,
      warning: `Middle Name value "${trimmed}" looks like it contains an annotation — verify manually.`,
    };
  }
  return { middleName: trimmed };
}

export function validateUtr(value: string | undefined): { utr?: number; warning?: string } {
  if (!value || isBlank(value)) return {};
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 16.5) {
    return { warning: `Invalid UTR value "${value}" — expected a number between 1 and 16.5.` };
  }
  return { utr: parsed };
}

export function validateWtn(value: string | undefined): { wtn?: number; warning?: string } {
  if (!value || isBlank(value)) return {};
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 40) {
    return { warning: `Invalid WTN value "${value}" — expected a number between 1 and 40.` };
  }
  return { wtn: parsed };
}
