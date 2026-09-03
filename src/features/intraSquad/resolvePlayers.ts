import {
  normalizePersonToken,
  rosterPlayerFirstName,
  rosterPlayerFullName,
} from "./roster";
import type { RosterPlayer } from "./types";

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
    return token === full || token === preferredFull;
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

export function resolveMatchPlayers(
  winnerName: string,
  loserName: string,
  roster: readonly RosterPlayer[],
  overrides?: { winnerPlayerId?: string; loserPlayerId?: string },
):
  | { status: "resolved"; winner: RosterPlayer; loser: RosterPlayer }
  | { status: "unknown"; token: string }
  | { status: "ambiguous"; winner: PlayerResolution; loser: PlayerResolution }
  | { status: "same-player"; player: RosterPlayer } {
  const winner = overrides?.winnerPlayerId
    ? resolveById(roster, overrides.winnerPlayerId, winnerName)
    : resolvePlayerName(winnerName, roster);
  const loser = overrides?.loserPlayerId
    ? resolveById(roster, overrides.loserPlayerId, loserName)
    : resolvePlayerName(loserName, roster);

  if (winner.status === "unknown") return { status: "unknown", token: winner.token };
  if (loser.status === "unknown") return { status: "unknown", token: loser.token };
  if (winner.status === "ambiguous" || loser.status === "ambiguous") {
    return { status: "ambiguous", winner, loser };
  }
  if (winner.player.id === loser.player.id) {
    return { status: "same-player", player: winner.player };
  }
  return { status: "resolved", winner: winner.player, loser: loser.player };
}

function resolveById(roster: readonly RosterPlayer[], id: string, token: string): PlayerResolution {
  const player = roster.find((row) => row.id === id);
  if (!player) return { status: "unknown", token };
  return { status: "resolved", player };
}
