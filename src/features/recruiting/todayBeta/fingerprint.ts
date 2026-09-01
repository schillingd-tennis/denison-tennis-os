import { createHash } from "node:crypto";

function normalizePart(value: string | undefined | null): string {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Stable dedupe key for a recruit match result. */
export function buildResultFingerprint(input: {
  recruitPersonId: string;
  tournamentName?: string;
  round?: string;
  opponentName?: string;
  score?: string;
}): string {
  const stable = [
    input.recruitPersonId.trim(),
    normalizePart(input.tournamentName) || "unknown-tournament",
    normalizePart(input.round) || "unknown-round",
    normalizePart(input.opponentName) || "unknown-opponent",
    normalizePart(input.score) || "unknown-score",
  ].join("|");

  return createHash("sha256").update(stable).digest("hex");
}
