export type InteractionOption = {
  id: string;
  label: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  classYear?: number | null;
  hometown?: string | null;
};

/** Canonical id is valid only while the visible text still matches that recruit. */
export function recruitIdAfterQueryChange(
  selected: InteractionOption | null,
  nextQuery: string,
): string {
  if (selected && nextQuery === selected.label) return selected.id;
  return "";
}

export function filterRecruits(recruits: InteractionOption[], query: string): InteractionOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return recruits.filter((recruit) => {
    const fields = [
      recruit.label,
      recruit.firstName,
      recruit.lastName,
      recruit.preferredName,
      [recruit.firstName, recruit.lastName].filter(Boolean).join(" "),
    ];
    return fields.some((field) => field?.toLowerCase().includes(needle));
  });
}

export function recruitSecondaryText(recruit: InteractionOption): string | null {
  const parts = [
    recruit.classYear != null ? String(recruit.classYear) : null,
    recruit.hometown?.trim() || null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
