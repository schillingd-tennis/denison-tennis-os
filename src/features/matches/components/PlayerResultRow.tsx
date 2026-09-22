"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";

import { formatDate } from "@/lib/formatting";
import { matchesEventPath } from "@/lib/module-routes";

import { correctPlayerMatchResultAction } from "../playerRecordActions";
import { eventDisplayTitle, playerNameFor } from "../display";
import { MATCH_RESULT_STATUSES, type MatchEvent, type MatchResult, type MatchResultStatus, type RosterPlayer, type WinnerSide } from "../types";

type HistoryRow = MatchResult & { event: MatchEvent; partnerId?: string | null };

function initialForm(row: HistoryRow, playerId: string) {
  return {
    matchDate: row.matchDate ?? row.event.startDate,
    opponentPlayerAName: row.opponentPlayerAName ?? "",
    opponentPlayerBName: row.opponentPlayerBName ?? "",
    opponentSchool: row.opponentSchool ?? "",
    status: row.status,
    winnerSide: row.winnerSide,
    scoreText: row.scoreText ?? "",
    partnerId: row.discipline === "doubles"
      ? row.denisonPlayerAId === playerId ? row.denisonPlayerBId : row.denisonPlayerAId
      : null,
  };
}

export default function PlayerResultRow({ row, playerId, roster }: {
  row: HistoryRow;
  playerId: string;
  roster: RosterPlayer[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => initialForm(row, playerId));

  function openEditor() {
    setForm(initialForm(row, playerId));
    setError(null);
    setEditing(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await correctPlayerMatchResultAction({
        resultId: row.id,
        eventId: row.eventId,
        playerId,
        ...form,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not update this result.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr className="align-top hover:bg-app-background/50">
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="tabular-nums">{formatDate(row.matchDate ?? row.event.startDate)}</span>
          <Link href={matchesEventPath(row.event.id)} className="mt-0.5 block text-xs text-text-secondary hover:underline">
            {eventDisplayTitle(row.event)}
          </Link>
        </td>
        <td className="px-4 py-3">
          <span className="font-medium">{[row.opponentPlayerAName, row.opponentPlayerBName].filter(Boolean).join(" / ") || "—"}</span>
          {row.discipline === "doubles" ? (
            <span className="mt-0.5 block text-xs text-text-secondary">Partner: {playerNameFor(row.partnerId, roster)}</span>
          ) : null}
        </td>
        <td className="px-4 py-3 text-text-secondary">{row.opponentSchool ?? "—"}</td>
        <td className="px-4 py-3 font-semibold">
          {row.winnerSide === "denison" ? "W" : row.winnerSide === "opponent" ? "L" : "—"}
          {row.status !== "completed" ? <span className="mt-0.5 block text-xs font-normal text-text-secondary">{row.status}</span> : null}
        </td>
        <td className="px-4 py-3 tabular-nums whitespace-nowrap">{row.scoreText ?? "—"}</td>
        <td className="px-4 py-3 text-right">
          <button type="button" onClick={openEditor} aria-label={`Edit ${row.discipline} result on ${formatDate(row.matchDate ?? row.event.startDate)}`} className="text-sm font-semibold text-[var(--module-accent)] hover:underline">
            Edit
          </button>
        </td>
      </tr>
      {editing ? (
        <tr>
          <td colSpan={6} className="bg-app-background/40 px-4 py-4">
            <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="grid gap-1 text-xs font-medium">Date
                <input type="date" required value={form.matchDate} onChange={(event) => setForm({ ...form, matchDate: event.target.value })} className="h-9 rounded-control border border-border bg-surface px-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs font-medium">Opponent Name
                <input value={form.opponentPlayerAName} onChange={(event) => setForm({ ...form, opponentPlayerAName: event.target.value })} className="h-9 rounded-control border border-border bg-surface px-2 text-sm" />
              </label>
              {row.discipline === "doubles" ? (
                <label className="grid gap-1 text-xs font-medium">Second Opponent
                  <input value={form.opponentPlayerBName} onChange={(event) => setForm({ ...form, opponentPlayerBName: event.target.value })} className="h-9 rounded-control border border-border bg-surface px-2 text-sm" />
                </label>
              ) : null}
              <label className="grid gap-1 text-xs font-medium">School
                <input value={form.opponentSchool} onChange={(event) => setForm({ ...form, opponentSchool: event.target.value })} className="h-9 rounded-control border border-border bg-surface px-2 text-sm" />
              </label>
              {row.discipline === "doubles" ? (
                <label className="grid gap-1 text-xs font-medium">Denison Partner
                  <select value={form.partnerId ?? ""} onChange={(event) => setForm({ ...form, partnerId: event.target.value || null })} className="h-9 rounded-control border border-border bg-surface px-2 text-sm">
                    <option value="">Select partner</option>
                    {roster.filter((player) => player.id !== playerId).map((player) => (
                      <option key={player.id} value={player.id}>{playerNameFor(player.id, roster)}</option>
                    ))}
                    {form.partnerId && !roster.some((player) => player.id === form.partnerId) ? (
                      <option value={form.partnerId}>{playerNameFor(form.partnerId, roster)} (existing)</option>
                    ) : null}
                  </select>
                </label>
              ) : null}
              <label className="grid gap-1 text-xs font-medium">Status
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as MatchResultStatus })} className="h-9 rounded-control border border-border bg-surface px-2 text-sm">
                  {MATCH_RESULT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium">Win/Loss
                <select value={form.winnerSide ?? "unknown"} onChange={(event) => setForm({ ...form, winnerSide: event.target.value as WinnerSide })} className="h-9 rounded-control border border-border bg-surface px-2 text-sm">
                  <option value="denison">Win</option>
                  <option value="opponent">Loss</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium">Score
                <input value={form.scoreText} onChange={(event) => setForm({ ...form, scoreText: event.target.value })} placeholder="6-4, 7-5" className="h-9 rounded-control border border-border bg-surface px-2 text-sm" />
              </label>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
                <button type="submit" disabled={busy} className="h-9 rounded-control bg-[var(--module-accent)] px-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button>
                <button type="button" disabled={busy} onClick={() => setEditing(false)} className="h-9 rounded-control border border-border bg-surface px-3 text-sm font-medium">Cancel</button>
              </div>
              {error ? <p role="alert" className="text-sm text-red-700 sm:col-span-2 lg:col-span-3">{error}</p> : null}
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}
