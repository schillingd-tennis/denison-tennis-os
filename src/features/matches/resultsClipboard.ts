import { eventDisplayTitle, formatOpponentLine, pairDisplayName, playerNameFor } from "./display";
import type { MatchEvent, MatchResult, RosterPlayer } from "./types";

function denisonParticipant(result: MatchResult, roster: readonly RosterPlayer[]): string {
  if (result.discipline === "doubles") {
    return pairDisplayName(
      result.denisonPlayerAId ?? "",
      result.denisonPlayerBId ?? "",
      roster,
    );
  }
  return playerNameFor(result.denisonPlayerAId, roster);
}

function outcomeLabel(result: MatchResult): string {
  if (result.winnerSide === "denison") return "W";
  if (result.winnerSide === "opponent") return "L";
  if (result.status === "bye") return "Bye";
  if (result.status === "unfinished") return "Unfinished";
  if (result.status === "cancelled") return "Cancelled";
  return "Outcome unknown";
}

function contextLabel(result: MatchResult): string {
  const context = [result.drawName, result.flightName, result.divisionName, result.roundLabel]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (result.lineupPosition != null) context.push(`#${result.lineupPosition}`);
  return context.join(" · ");
}

/** Plain-text, paste-ready export of every official result stored for one event. */
export function formatEventResultsForClipboard(input: {
  event: MatchEvent;
  results: readonly MatchResult[];
  roster: readonly RosterPlayer[];
}): string {
  const { event, results, roster } = input;
  const lines = [
    eventDisplayTitle(event),
    `${results.length} recorded match${results.length === 1 ? "" : "es"}`,
    "",
  ];

  results.forEach((result, index) => {
    const metadata = [
      result.matchDate,
      result.discipline === "doubles" ? "Doubles" : "Singles",
      contextLabel(result),
    ].filter(Boolean);
    const score = result.scoreText?.trim() || result.originalScoreText?.trim() || "Score not recorded";

    lines.push(`${index + 1}. ${metadata.join(" · ")}`);
    lines.push(
      `   ${outcomeLabel(result)} — ${denisonParticipant(result, roster)} vs ${formatOpponentLine(result)}`,
    );
    lines.push(`   ${score}${result.status !== "completed" ? ` · ${result.status}` : ""}`);
    if (result.notes?.trim()) lines.push(`   Notes: ${result.notes.trim()}`);
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}
