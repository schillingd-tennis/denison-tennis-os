import type { MatchEventType } from "./types";

export type EventTypeDetection =
  | { status: "dual"; confidence: number; reasons: string[] }
  | { status: "tournament"; confidence: number; reasons: string[] }
  | { status: "ambiguous"; confidence: number; reasons: string[] };

const DUAL_HINTS = [
  /\bdual\b/i,
  /\bvs\.?\b/i,
  /\bversus\b/i,
  /\bbox\s*score\b/i,
  /\bteam\s+score\b/i,
  /\bfinal\s*:\s*\d+\s*[-–—]\s*\d+/i,
  /\b[1-6]\s*(?:singles|s)\b/i,
  /\b[1-3]\s*(?:doubles|d)\b/i,
  /\bdoubles\s*point\b/i,
  /\bhome\b|\baway\b|\bat\s+denison\b/i,
];

const TOURNAMENT_HINTS = [
  /\btournament\b/i,
  /\binvite\b/i,
  /\binvitational\b/i,
  /\bregionals?\b/i,
  /\bchampionships?\b/i,
  /\bmain\s*draw\b/i,
  /\bconsolation\b/i,
  /\bflight\b/i,
  /\bround\s+of\s+\d+/i,
  /\bqf\b|\bsf\b|\bfinal\b|\bsemi/i,
  /\bR16\b|\bR32\b/i,
];

/**
 * Auto-detect Dual vs Individual Tournament from pasted box-score text.
 * Ambiguous cases require an explicit user choice — never silently guess.
 */
export function detectMatchEventType(text: string): EventTypeDetection {
  const dualHits = DUAL_HINTS.filter((re) => re.test(text));
  const tournamentHits = TOURNAMENT_HINTS.filter((re) => re.test(text));
  const reasons: string[] = [];
  if (dualHits.length) reasons.push(`dual cues (${dualHits.length})`);
  if (tournamentHits.length) reasons.push(`tournament cues (${tournamentHits.length})`);

  if (dualHits.length > 0 && tournamentHits.length === 0) {
    return { status: "dual", confidence: Math.min(0.95, 0.55 + dualHits.length * 0.1), reasons };
  }
  if (tournamentHits.length > 0 && dualHits.length === 0) {
    return {
      status: "tournament",
      confidence: Math.min(0.95, 0.55 + tournamentHits.length * 0.1),
      reasons,
    };
  }
  if (dualHits.length === 0 && tournamentHits.length === 0) {
    return { status: "ambiguous", confidence: 0.2, reasons: ["no clear dual or tournament cues"] };
  }
  // Both present — prefer dual only when lineup positions dominate and no draw/round language
  const hasLineup = /\b[1-6]\.\s*[A-Za-z]/.test(text) || /\b(?:singles|doubles)\s*[1-6]\b/i.test(text);
  const hasDraw = /\b(?:draw|flight|consolation|round of)\b/i.test(text);
  if (hasLineup && !hasDraw && dualHits.length >= tournamentHits.length) {
    return { status: "dual", confidence: 0.6, reasons: [...reasons, "lineup positions"] };
  }
  if (hasDraw && !hasLineup) {
    return { status: "tournament", confidence: 0.65, reasons: [...reasons, "draw/round language"] };
  }
  return { status: "ambiguous", confidence: 0.4, reasons };
}

export function resolveForcedEventType(
  detection: EventTypeDetection,
  forced: MatchEventType | "auto",
): { eventType: MatchEventType | null; needsUserChoice: boolean; detection: EventTypeDetection } {
  if (forced === "dual" || forced === "tournament") {
    return { eventType: forced, needsUserChoice: false, detection };
  }
  if (detection.status === "ambiguous") {
    return { eventType: null, needsUserChoice: true, detection };
  }
  return { eventType: detection.status, needsUserChoice: false, detection };
}
