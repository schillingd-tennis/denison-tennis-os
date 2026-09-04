"use client";

import { useState, type FormEvent } from "react";

import { saveIntraSquadMatchAction } from "../actions";
import { playedAtForMatchForm } from "../dates";
import { scoreImpliesMatchStatus } from "../normalizeEditedMatch";
import { parseScoreSets } from "../parseScore";
import {
  INTRA_SQUAD_WEIGHTS,
  MATCH_STATUSES,
  type IntraSquadMatch,
  type IntraSquadMatchInput,
  type MatchStatus,
  type RosterPlayer,
} from "../types";
import { rosterPlayerFullName } from "../roster";

const control =
  "mt-1 h-9 w-full rounded-control border border-border bg-surface px-2.5 text-sm text-text-primary";
const labelClass = "block text-xs font-semibold text-text-secondary";

function syncStatusFromScore(scoreText: string, current: MatchStatus): MatchStatus {
  const parsed = parseScoreSets(scoreText, { allowPartialSets: true });
  if ("error" in parsed) return current;
  const implied = scoreImpliesMatchStatus(parsed.sets);
  if (implied === "completed" || implied === "unfinished") return implied;
  // One finished set: prefer Intra Squad one-set completed while typing.
  // Coach can still flip Status to Unfinished explicitly before save.
  if (implied === "ambiguous") return "completed";
  return current;
}

export default function IntraSquadMatchForm({
  match,
  roster,
  onSaved,
  onCancel,
  onRequestDelete,
}: {
  match?: IntraSquadMatch;
  roster: RosterPlayer[];
  onSaved: (match: IntraSquadMatch) => void;
  onCancel: () => void;
  onRequestDelete?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<MatchStatus>(match?.status ?? "completed");
  const unfinished = status === "unfinished";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const scoreText = String(form.get("scoreText") || "");
    const statusHint = syncStatusFromScore(
      scoreText,
      String(form.get("status") || status) as MatchStatus,
    );
    setStatus(statusHint);
    const primaryId = String(form.get("primaryPlayerId") || "");
    const opponentId = String(form.get("opponentPlayerId") || "");
    // Server reclassifies from score; send players as primary/opponent under the synced hint.
    const input: Partial<IntraSquadMatchInput> =
      statusHint === "unfinished"
        ? {
            playedAt: String(form.get("playedAt") || ""),
            status: "unfinished",
            winnerPlayerId: null,
            loserPlayerId: null,
            leaderPlayerId: primaryId,
            trailingPlayerId: opponentId,
            scoreText,
            weight: Number(form.get("weight") || 1) as IntraSquadMatchInput["weight"],
            sourceText: match?.sourceText ?? null,
          }
        : {
            playedAt: String(form.get("playedAt") || ""),
            status: "completed",
            winnerPlayerId: primaryId,
            loserPlayerId: opponentId,
            leaderPlayerId: null,
            trailingPlayerId: null,
            scoreText,
            weight: Number(form.get("weight") || 1) as IntraSquadMatchInput["weight"],
            sourceText: match?.sourceText ?? null,
          };
    const result = await saveIntraSquadMatchAction(match?.id ?? null, input);
    if (!result.success) {
      setError(result.error);
      setSaving(false);
      return;
    }
    onSaved(result.match);
  }

  const defaultPrimary = match?.winnerPlayerId ?? match?.leaderPlayerId ?? "";
  const defaultOpponent = match?.loserPlayerId ?? match?.trailingPlayerId ?? "";

  return (
    <form onSubmit={onSubmit} className="space-y-3 p-5">
      <label className={labelClass}>
        Date
        <input
          name="playedAt"
          type="date"
          autoComplete="off"
          className={control}
          defaultValue={playedAtForMatchForm(match)}
          required
        />
      </label>
      <label className={labelClass}>
        Status
        <select
          name="status"
          className={control}
          value={status}
          onChange={(event) => setStatus(event.target.value as MatchStatus)}
        >
          {MATCH_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value === "unfinished" ? "Unfinished" : "Completed"}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {unfinished ? "Leader" : "Winner"}
        <select name="primaryPlayerId" className={control} defaultValue={defaultPrimary} required>
          <option value="">Select player</option>
          {roster.map((player) => (
            <option key={player.id} value={player.id}>
              {rosterPlayerFullName(player)}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {unfinished ? "Trailing Player" : "Loser"}
        <select name="opponentPlayerId" className={control} defaultValue={defaultOpponent} required>
          <option value="">Select player</option>
          {roster.map((player) => (
            <option key={player.id} value={player.id}>
              {rosterPlayerFullName(player)}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Score
        <input
          name="scoreText"
          className={control}
          defaultValue={match?.scoreText ?? ""}
          placeholder={unfinished ? "6-4, 3-2" : "6-1, 6-1"}
          required
          onChange={(event) => {
            setStatus((current) => syncStatusFromScore(event.target.value, current));
          }}
          onBlur={(event) => {
            setStatus((current) => syncStatusFromScore(event.target.value, current));
          }}
        />
      </label>
      <label className={labelClass}>
        Weight
        <select name="weight" className={control} defaultValue={match?.weight ?? 1}>
          {INTRA_SQUAD_WEIGHTS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex items-center justify-between gap-2 pt-1">
        {match && onRequestDelete ? (
          <button
            type="button"
            className="h-9 rounded-control px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
            onClick={onRequestDelete}
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className="h-9 rounded-control border border-border px-3 text-xs font-semibold" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-control bg-[var(--module-accent)] px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : match ? "Save Changes" : "Add Match"}
          </button>
        </div>
      </div>
    </form>
  );
}
