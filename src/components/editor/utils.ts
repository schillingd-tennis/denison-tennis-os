/** Converts a raw `<input>` string to the optional-number shape `Person` fields use. */
export function toOptionalNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Converts a raw `<input>` string to the optional-string shape `Person` fields use. */
export function toOptionalString(raw: string): string | undefined {
  return raw.trim() === "" ? undefined : raw;
}
