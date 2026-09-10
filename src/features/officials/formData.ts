const PREFERRED = new Set(["Email", "Phone", "Text", "No preference"]);

export type OfficialWritePayload = {
  name: string;
  email: string | null;
  phone: string | null;
  preferred_contact: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  rate: string | null;
  ranking: number | null;
  is_area_assignor: boolean;
  assignor_area: string | null;
  notes: string | null;
};

export type OfficialFormParseResult =
  | { ok: true; id: string | null; payload: OfficialWritePayload }
  | { ok: false; message: string };

/** Blank and missing FormData entries both become null (intentional clear). */
export function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

/**
 * Ranking form text → nullable integer.
 * Empty / missing → null. Invalid → undefined (caller rejects).
 */
export function optionalRanking(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return undefined;
  return parsed;
}

export function preferredContact(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return PREFERRED.has(text) ? text : undefined;
}

/**
 * Area Assignor: unchecked checkbox / missing / "false" → false.
 * "true" / "on" / "1" → true. Never treat absence as true.
 */
export function parseAreaAssignor(value: FormDataEntryValue | null) {
  if (value == null) return false;
  const text = String(value).trim().toLowerCase();
  return text === "true" || text === "on" || text === "1";
}

export function readOfficialFormData(
  formData: FormData,
  normalizeEmail: (value: string) => string | undefined = (value) => {
    const trimmed = value.trim();
    return trimmed ? trimmed.toLowerCase() : undefined;
  },
): OfficialFormParseResult {
  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Official name is required." };

  const ranking = optionalRanking(formData.get("ranking"));
  if (ranking === undefined) {
    return { ok: false, message: "Ranking must be a whole number from 1 to 5." };
  }

  const preferred = preferredContact(formData.get("preferredContact"));
  if (preferred === undefined) {
    return { ok: false, message: "Preferred contact is invalid." };
  }

  const emailRaw = String(formData.get("email") ?? "");
  const email = normalizeEmail(emailRaw) ?? null;

  return {
    ok: true,
    id,
    payload: {
      name,
      email,
      phone: optionalText(formData.get("phone")),
      preferred_contact: preferred,
      address_line1: optionalText(formData.get("addressLine1")),
      address_line2: optionalText(formData.get("addressLine2")),
      city: optionalText(formData.get("city")),
      state: optionalText(formData.get("state"))?.toUpperCase() ?? null,
      postal_code: optionalText(formData.get("postalCode")),
      rate: optionalText(formData.get("rate")),
      ranking,
      is_area_assignor: parseAreaAssignor(formData.get("isAreaAssignor")),
      assignor_area: optionalText(formData.get("assignorArea")),
      notes: optionalText(formData.get("notes")),
    },
  };
}
