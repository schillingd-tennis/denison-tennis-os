import type { RosterPlayer } from "./types";

export function normalizePersonToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ");
}

export function rosterPlayerFullName(player: RosterPlayer): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

export function rosterPlayerFirstName(player: RosterPlayer): string {
  return player.preferredName?.trim() || player.firstName;
}

export function rosterPlayerDisplayName(player: RosterPlayer): string {
  const preferred = player.preferredName?.trim();
  if (preferred) return `${preferred} ${player.lastName}`.trim();
  return rosterPlayerFullName(player);
}

export type PlayerResolution =
  | { status: "resolved"; player: RosterPlayer }
  | { status: "unknown"; token: string }
  | { status: "ambiguous"; token: string; candidates: RosterPlayer[] };

export function resolvePlayerName(raw: string, roster: readonly RosterPlayer[]): PlayerResolution {
  const token = normalizePersonToken(raw);
  if (!token) return { status: "unknown", token: raw.trim() };

  const fullHits = roster.filter((player) => {
    const full = normalizePersonToken(rosterPlayerFullName(player));
    const preferredFull = player.preferredName
      ? normalizePersonToken(`${player.preferredName} ${player.lastName}`)
      : "";
    const lastFirst = normalizePersonToken(`${player.lastName}, ${player.firstName}`);
    const initialLast = normalizePersonToken(
      `${player.firstName.charAt(0)} ${player.lastName}`,
    );
    const preferredInitial = player.preferredName
      ? normalizePersonToken(`${player.preferredName.charAt(0)} ${player.lastName}`)
      : "";
    return (
      token === full ||
      token === preferredFull ||
      token === lastFirst ||
      token === initialLast ||
      (preferredInitial && token === preferredInitial)
    );
  });
  if (fullHits.length === 1) return { status: "resolved", player: fullHits[0]! };
  if (fullHits.length > 1) {
    return { status: "ambiguous", token: raw.trim(), candidates: fullHits };
  }

  const firstHits = roster.filter((player) => {
    const first = normalizePersonToken(player.firstName);
    const preferred = player.preferredName ? normalizePersonToken(player.preferredName) : "";
    const display = normalizePersonToken(rosterPlayerFirstName(player));
    return token === first || token === preferred || token === display;
  });
  if (firstHits.length === 1) return { status: "resolved", player: firstHits[0]! };
  if (firstHits.length > 1) {
    return { status: "ambiguous", token: raw.trim(), candidates: firstHits };
  }

  const lastHits = roster.filter((player) => normalizePersonToken(player.lastName) === token);
  if (lastHits.length === 1) return { status: "resolved", player: lastHits[0]! };
  if (lastHits.length > 1) {
    return { status: "ambiguous", token: raw.trim(), candidates: lastHits };
  }

  return { status: "unknown", token: raw.trim() };
}

export function resolveById(
  roster: readonly RosterPlayer[],
  id: string,
  token: string,
): PlayerResolution {
  const player = roster.find((row) => row.id === id);
  if (!player) return { status: "unknown", token };
  return { status: "resolved", player };
}

export function toDraftParticipant(
  rawName: string,
  roster: readonly RosterPlayer[],
  overrideId?: string | null,
): import("./types").DraftParticipantRef {
  if (overrideId) {
    const byId = resolveById(roster, overrideId, rawName);
    if (byId.status === "resolved") {
      return {
        rawName,
        personId: byId.player.id,
        resolution: "manual",
      };
    }
  }
  const resolved = resolvePlayerName(rawName, roster);
  if (resolved.status === "resolved") {
    return { rawName, personId: resolved.player.id, resolution: "resolved" };
  }
  if (resolved.status === "ambiguous") {
    return {
      rawName,
      personId: null,
      resolution: "ambiguous",
      candidateIds: resolved.candidates.map((c) => c.id),
    };
  }
  return { rawName, personId: null, resolution: "unknown" };
}

/** Parse "Last/Last", "A / B", "A and B", "A & B". */
export function splitPairNames(raw: string): [string, string] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const slash = trimmed.split(/\s*\/\s*/);
  if (slash.length === 2 && slash[0] && slash[1]) return [slash[0], slash[1]];
  const and = trimmed.split(/\s+(?:and|&)\s+/i);
  if (and.length === 2 && and[0] && and[1]) return [and[0], and[1]];
  return null;
}

/** Canonical pair key so A/B === B/A. */
export function doublesPairKey(playerAId: string, playerBId: string): string {
  return [playerAId, playerBId].sort().join(":");
}
