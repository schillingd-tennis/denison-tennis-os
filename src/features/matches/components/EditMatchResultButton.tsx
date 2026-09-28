"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { modulePrimaryButtonClassSm } from "@/components/module-theme";

import { playerNameFor } from "../display";
import { correctPlayerMatchResultAction } from "../playerRecordActions";
import { resolveMatchSchoolName } from "../schoolNames";
import {
  MATCH_RESULT_STATUSES,
  type MatchResult,
  type MatchResultStatus,
  type RosterPlayer,
  type WinnerSide,
} from "../types";

function initialForm(result: MatchResult) {
  return {
    matchDate: result.matchDate ?? "",
    opponentPlayerAName: result.opponentPlayerAName ?? "",
    opponentPlayerBName: result.opponentPlayerBName ?? "",
    opponentSchool: resolveMatchSchoolName(result.opponentSchool).name ?? "",
    status: result.status,
    winnerSide: result.winnerSide ?? "unknown",
    scoreText: result.scoreText ?? "",
    partnerId: result.denisonPlayerBId,
  };
}

export default function EditMatchResultButton({
  result,
  roster,
}: {
  result: MatchResult;
  roster: RosterPlayer[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => initialForm(result));
  const playerId = result.denisonPlayerAId;

  function showEditor() {
    setForm(initialForm(result));
    setError(null);
    setOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!playerId) {
      setError("Select a Denison player before editing this result.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await correctPlayerMatchResultAction({
        resultId: result.id,
        eventId: result.eventId,
        playerId,
        ...form,
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not update this result.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={showEditor}
        disabled={!playerId}
        aria-label="Edit match result"
        className="inline-flex h-8 items-center justify-center rounded-control border border-[var(--module-border)] bg-surface px-2.5 text-xs font-semibold text-[var(--module-accent)] transition-colors hover:bg-[var(--module-tint)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Edit
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-result-${result.id}`}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 id={`edit-result-${result.id}`} className="text-base font-semibold text-text-primary">
                  Edit Result
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {playerNameFor(playerId, roster)} · {result.discipline === "doubles" ? "Doubles" : "Singles"}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="text-xl leading-none text-text-secondary hover:text-text-primary disabled:opacity-50"
                aria-label="Close result editor"
              >
                ×
              </button>
            </div>

            <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium text-text-primary">
                Date
                <input
                  type="date"
                  required
                  value={form.matchDate}
                  onChange={(event) => setForm({ ...form, matchDate: event.target.value })}
                  className="h-10 rounded-control border border-border bg-surface px-3 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-text-primary">
                School
                <input
                  value={form.opponentSchool}
                  onChange={(event) => setForm({ ...form, opponentSchool: event.target.value })}
                  className="h-10 rounded-control border border-border bg-surface px-3 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-text-primary">
                Opponent Name
                <input
                  required={form.status === "completed"}
                  value={form.opponentPlayerAName}
                  onChange={(event) => setForm({ ...form, opponentPlayerAName: event.target.value })}
                  className="h-10 rounded-control border border-border bg-surface px-3 text-sm"
                />
              </label>
              {result.discipline === "doubles" ? (
                <label className="grid gap-1 text-xs font-medium text-text-primary">
                  Second Opponent
                  <input
                    value={form.opponentPlayerBName}
                    onChange={(event) => setForm({ ...form, opponentPlayerBName: event.target.value })}
                    className="h-10 rounded-control border border-border bg-surface px-3 text-sm"
                  />
                </label>
              ) : null}
              {result.discipline === "doubles" ? (
                <label className="grid gap-1 text-xs font-medium text-text-primary">
                  Denison Partner
                  <select
                    required
                    value={form.partnerId ?? ""}
                    onChange={(event) => setForm({ ...form, partnerId: event.target.value || null })}
                    className="h-10 rounded-control border border-border bg-surface px-3 text-sm"
                  >
                    <option value="">Select partner</option>
                    {roster
                      .filter((player) => player.id !== playerId)
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {playerNameFor(player.id, roster)}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
              <label className="grid gap-1 text-xs font-medium text-text-primary">
                Status
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as MatchResultStatus })}
                  className="h-10 rounded-control border border-border bg-surface px-3 text-sm capitalize"
                >
                  {MATCH_RESULT_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-text-primary">
                Win/Loss
                <select
                  value={form.winnerSide}
                  onChange={(event) => setForm({ ...form, winnerSide: event.target.value as WinnerSide })}
                  className="h-10 rounded-control border border-border bg-surface px-3 text-sm"
                >
                  <option value="denison">Win</option>
                  <option value="opponent">Loss</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-text-primary sm:col-span-2">
                Score
                <input
                  value={form.scoreText}
                  onChange={(event) => setForm({ ...form, scoreText: event.target.value })}
                  placeholder="6-4, 7-5"
                  className="h-10 rounded-control border border-border bg-surface px-3 text-sm"
                />
              </label>

              {error ? <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}

              <div className="flex justify-end gap-2 border-t border-border pt-4 sm:col-span-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                  className="h-9 rounded-control border border-border bg-surface px-3 text-sm font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button type="submit" disabled={busy} className={modulePrimaryButtonClassSm}>
                  {busy ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
