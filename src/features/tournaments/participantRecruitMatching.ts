export type RecruitNameCandidate = { personId: string; displayName: string };

export function normalizeRecruitName(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function splitParticipantName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] ?? "Unknown", lastName: "Unknown" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) ?? "Unknown" };
}

export function indexRecruitNames(candidates: readonly RecruitNameCandidate[]): Map<string, RecruitNameCandidate[]> {
  const index = new Map<string, RecruitNameCandidate[]>();
  for (const candidate of candidates) {
    const key = normalizeRecruitName(candidate.displayName);
    if (key) index.set(key, [...(index.get(key) ?? []), candidate]);
  }
  return index;
}
