import { resultFingerprint } from "./scoreParse";
import type { DualImportDraft, MatchesImportDraft, TournamentImportDraft } from "./types";

export type DraftValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function validateImportDraft(
  draft: MatchesImportDraft,
  options?: { scheduleLinked?: boolean },
): DraftValidation {
  const errors: string[] = [];
  const warnings: string[] = [...draft.flags];
  const scheduleLinked = options?.scheduleLinked ?? false;

  if (draft.kind === "dual") {
    validateDual(draft, errors, warnings, scheduleLinked);
  } else {
    validateTournament(draft, errors, warnings, scheduleLinked);
  }

  return { ok: errors.length === 0, errors, warnings };
}

function validateDual(
  draft: DualImportDraft,
  errors: string[],
  warnings: string[],
  scheduleLinked: boolean,
) {
  if (!scheduleLinked) {
    if (!draft.opposingTeamName?.trim()) errors.push("Opposing team name is required.");
    if (!draft.startDate) errors.push("Match date is required.");
  } else if (!draft.opposingTeamName?.trim()) {
    warnings.push("Draft opponent empty — Schedule opponent will be used.");
  }
  if (draft.results.length === 0) errors.push("Add at least one court result before saving.");
  if (draft.teamScoreDiscrepancy) {
    warnings.push("Reported team score differs from calculated — both are preserved.");
  }

  const fingerprints = new Set<string>();
  for (const [index, row] of draft.results.entries()) {
    if (!row.denisonA.personId) {
      errors.push(
        `Row ${index + 1}: select a Denison player (ambiguous/unknown names cannot be saved silently).`,
      );
    }
    if (row.discipline === "doubles" && !row.denisonB?.personId) {
      errors.push(`Row ${index + 1}: doubles requires both Denison partners resolved.`);
    }
    if (row.status === "completed" && (row.winnerSide == null || row.winnerSide === "unknown")) {
      warnings.push(
        `Row ${index + 1}: completed without a known winner — will not count as W/L until corrected.`,
      );
    }
    const fp = resultFingerprint({
      discipline: row.discipline,
      lineupPosition: row.lineupPosition,
      denisonPlayerAId: row.denisonA.personId,
      denisonPlayerBId: row.denisonB?.personId,
      opponentA: row.opponentAName,
      opponentB: row.opponentBName,
      scoreText: row.scoreText,
      status: row.status,
    });
    if (fingerprints.has(fp)) warnings.push(`Row ${index + 1}: duplicate of another row in this draft.`);
    fingerprints.add(fp);
  }
}

function validateTournament(
  draft: TournamentImportDraft,
  errors: string[],
  warnings: string[],
  scheduleLinked: boolean,
) {
  if (!scheduleLinked) {
    if (!draft.title?.trim()) errors.push("Tournament name is required.");
    if (!draft.startDate) errors.push("Start date is required.");
  } else if (!draft.title?.trim()) {
    warnings.push("Draft title empty — Schedule event name will be used.");
  }
  if (draft.results.length === 0) errors.push("Add at least one result before saving.");

  const fingerprints = new Set<string>();
  for (const [index, row] of draft.results.entries()) {
    if (!row.denisonA.personId) {
      errors.push(`Row ${index + 1}: select a Denison player.`);
    }
    if (row.discipline === "doubles" && !row.denisonB?.personId) {
      errors.push(`Row ${index + 1}: doubles requires both Denison partners resolved.`);
    }
    const fp = resultFingerprint({
      discipline: row.discipline,
      drawName: row.drawName,
      roundLabel: row.roundLabel,
      denisonPlayerAId: row.denisonA.personId,
      denisonPlayerBId: row.denisonB?.personId,
      opponentA: row.opponentAName,
      opponentB: row.opponentBName,
      scoreText: row.scoreText,
      status: row.status,
    });
    if (fingerprints.has(fp)) warnings.push(`Row ${index + 1}: duplicate of another row in this draft.`);
    fingerprints.add(fp);
  }
}
