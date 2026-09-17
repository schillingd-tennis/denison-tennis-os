"use client";

import { useMemo, useState } from "react";

import type { TeamScheduleEvent } from "@/features/teamSchedule/types";
import { displayOpponentOrEvent } from "@/features/teamSchedule/types";

import {
  confirmMatchesImportAction,
  ensureMatchEventForScheduleAction,
} from "../actions";
import { scheduleResultsFormat } from "../scheduleLink";
import { rosterPlayerDisplayName } from "../resolvePlayers";
import { calculateDualTeamScores } from "../scoringRules";
import { validateImportDraft } from "../validateDraft";
import type {
  DualDraftLineResult,
  DualImportDraft,
  MatchDiscipline,
  MatchResult,
  MatchResultStatus,
  RosterPlayer,
  TournamentDraftResult,
  TournamentImportDraft,
  WinnerSide,
} from "../types";

type ManualRow = {
  key: string;
  discipline: MatchDiscipline;
  lineupPosition: string;
  drawName: string;
  flightName: string;
  roundLabel: string;
  playerAId: string;
  playerBId: string;
  opponentA: string;
  opponentB: string;
  opponentSchool: string;
  scoreText: string;
  status: MatchResultStatus;
  winnerSide: WinnerSide | "";
};

function emptyRow(discipline: MatchDiscipline = "singles"): ManualRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    discipline,
    lineupPosition: "",
    drawName: "",
    flightName: "",
    roundLabel: "",
    playerAId: "",
    playerBId: "",
    opponentA: "",
    opponentB: "",
    opponentSchool: "",
    scoreText: "",
    status: "completed",
    winnerSide: "denison",
  };
}

function participant(personId: string, roster: readonly RosterPlayer[]) {
  const player = roster.find((p) => p.id === personId);
  return {
    rawName: player ? rosterPlayerDisplayName(player) : "",
    personId: personId || null,
    resolution: (personId ? "manual" : "unknown") as "manual" | "unknown",
  };
}

export default function ManualResultsEntry({
  roster,
  schedule,
  onSaved,
  onCancel,
}: {
  roster: RosterPlayer[];
  schedule: TeamScheduleEvent;
  onSaved: (eventId: string) => void;
  onCancel?: () => void;
}) {
  const format = scheduleResultsFormat(schedule);
  const [rows, setRows] = useState<ManualRow[]>([emptyRow("singles")]);
  const [teamDenison, setTeamDenison] = useState("");
  const [teamOpponent, setTeamOpponent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = useMemo((): DualImportDraft | TournamentImportDraft | null => {
    if (format.ambiguous) return null;
    if (format.status === "dual") {
      const results: DualDraftLineResult[] = rows.map((row) => ({
        discipline: row.discipline,
        lineupPosition: row.lineupPosition ? Number(row.lineupPosition) : null,
        denisonA: participant(row.playerAId, roster),
        denisonB:
          row.discipline === "doubles" ? participant(row.playerBId, roster) : null,
        opponentAName: row.opponentA.trim() || null,
        opponentBName: row.opponentB.trim() || null,
        opponentSchool: row.opponentSchool.trim() || schedule.opponentName,
        status: row.status,
        winnerSide: row.winnerSide || null,
        scoreText: row.scoreText.trim() || null,
        scoreSets: [],
        originalScoreText: row.scoreText.trim() || null,
        sourceExcerpt: "Manual entry",
        countsTowardTeamPoint: true,
        teamPointAwardedTo:
          row.winnerSide === "denison"
            ? "denison"
            : row.winnerSide === "opponent"
              ? "opponent"
              : "none",
        flags: ["manual_entry"],
      }));
      const calculated = calculateDualTeamScores(
        results.map(
          (r, index): MatchResult => ({
            id: String(index),
            eventId: "draft",
            discipline: r.discipline,
            resultKind: "dual_lineup",
            lineupPosition: r.lineupPosition,
            drawName: null,
            flightName: null,
            divisionName: null,
            roundLabel: null,
            matchDate: schedule.startDate,
            status: r.status,
            winnerSide: r.winnerSide,
            scoreText: r.scoreText,
            scoreSets: [],
            originalScoreText: r.originalScoreText,
            sourceExcerpt: r.sourceExcerpt,
            notes: null,
            denisonPlayerAId: r.denisonA.personId,
            denisonPlayerBId: r.denisonB?.personId ?? null,
            doublesPairId: null,
            opponentPlayerAName: r.opponentAName,
            opponentPlayerBName: r.opponentBName,
            opponentSchool: r.opponentSchool,
            countsTowardTeamPoint: r.countsTowardTeamPoint,
            teamPointAwardedTo: r.teamPointAwardedTo,
            importFingerprint: null,
            createdAt: "",
            updatedAt: "",
          }),
        ),
        "ncaa_standard",
      );
      const reportedD = teamDenison === "" ? null : Number(teamDenison);
      const reportedO = teamOpponent === "" ? null : Number(teamOpponent);
      const teamOutcome =
        reportedD != null && reportedO != null
          ? reportedD > reportedO
            ? "win"
            : reportedD < reportedO
              ? "loss"
              : "tie"
          : calculated.denison > calculated.opponent
            ? "win"
            : calculated.denison < calculated.opponent
              ? "loss"
              : calculated.denison === calculated.opponent && calculated.denison > 0
                ? "tie"
                : null;
      return {
        kind: "dual",
        opposingTeamName: schedule.opponentName,
        seasonYear: schedule.seasonYear,
        seasonSegment: schedule.seasonSegment,
        startDate: schedule.startDate,
        site: schedule.siteDesignation,
        locationText: schedule.locationText,
        venueName: schedule.venueName,
        scoringFormat: "ncaa_standard",
        reportedTeamScoreDenison: reportedD,
        reportedTeamScoreOpponent: reportedO,
        calculatedTeamScoreDenison: calculated.denison,
        calculatedTeamScoreOpponent: calculated.opponent,
        teamOutcome,
        teamScoreDiscrepancy:
          reportedD != null &&
          reportedO != null &&
          (reportedD !== calculated.denison || reportedO !== calculated.opponent),
        results,
        confidence: 1,
        interpretation: `Manual dual entry for ${displayOpponentOrEvent(schedule)}`,
        flags: ["manual_entry"],
      };
    }

    const results: TournamentDraftResult[] = rows.map((row) => ({
      discipline: row.discipline,
      drawName: row.drawName.trim() || null,
      flightName: row.flightName.trim() || null,
      divisionName: null,
      roundLabel: row.roundLabel.trim() || null,
      matchDate: schedule.startDate,
      denisonA: participant(row.playerAId, roster),
      denisonB:
        row.discipline === "doubles" ? participant(row.playerBId, roster) : null,
      opponentAName: row.opponentA.trim() || null,
      opponentBName: row.opponentB.trim() || null,
      opponentSchool: row.opponentSchool.trim() || null,
      status: row.status,
      winnerSide: row.winnerSide || null,
      scoreText: row.scoreText.trim() || null,
      scoreSets: [],
      originalScoreText: row.scoreText.trim() || null,
      sourceExcerpt: "Manual entry",
      flags: ["manual_entry"],
    }));
    return {
      kind: "tournament",
      title: displayOpponentOrEvent(schedule),
      seasonYear: schedule.seasonYear,
      seasonSegment: schedule.seasonSegment,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      locationText: schedule.locationText,
      results,
      confidence: 1,
      interpretation: `Manual tournament entry for ${displayOpponentOrEvent(schedule)}`,
      flags: ["manual_entry"],
    };
  }, [format, rows, roster, schedule, teamDenison, teamOpponent]);

  const validation = draft ? validateImportDraft(draft, { scheduleLinked: true }) : null;

  function updateRow(key: string, patch: Partial<ManualRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function save() {
    if (format.ambiguous) {
      setError(format.reason);
      return;
    }
    if (!draft || !validation?.ok) {
      setError(validation?.errors.join(" ") || "Fix validation errors before saving.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ensured = await ensureMatchEventForScheduleAction(schedule.id);
      if (!ensured.ok) {
        setError(ensured.error);
        return;
      }
      const result = await confirmMatchesImportAction({
        draft,
        sourceText: `[manual entry]\n${JSON.stringify(draft.results.map((r) => r.sourceExcerpt))}`,
        scheduleEventId: schedule.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result.eventId);
    } finally {
      setBusy(false);
    }
  }

  if (format.ambiguous) {
    return (
      <div className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {format.reason}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-secondary">
        Manual entry for <span className="font-semibold text-text-primary">{displayOpponentOrEvent(schedule)}</span>
        {" · "}
        {format.status === "dual" ? "Dual lineup" : "Tournament draw / round"}
        . Same validation and persistence as paste/AI import.
      </p>

      {format.status === "dual" ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-text-secondary">
            Team score (Denison)
            <input
              type="number"
              min={0}
              value={teamDenison}
              onChange={(e) => setTeamDenison(e.target.value)}
              className="mt-1 block h-9 w-20 rounded-control border border-border bg-surface px-2 text-sm"
            />
          </label>
          <label className="text-xs text-text-secondary">
            Opponent
            <input
              type="number"
              min={0}
              value={teamOpponent}
              onChange={(e) => setTeamOpponent(e.target.value)}
              className="mt-1 block h-9 w-20 rounded-control border border-border bg-surface px-2 text-sm"
            />
          </label>
          <p className="text-[11px] text-text-secondary">
            Optional. Individual courts still calculate; Mark complete is separate.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div key={row.key} className="rounded-card border border-border bg-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-text-secondary">Row {index + 1}</p>
              <button
                type="button"
                className="text-xs text-text-secondary hover:text-text-primary"
                onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                disabled={rows.length === 1}
              >
                Remove
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs text-text-secondary">
                Discipline
                <select
                  value={row.discipline}
                  onChange={(e) =>
                    updateRow(row.key, { discipline: e.target.value as MatchDiscipline })
                  }
                  className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                >
                  <option value="singles">Singles</option>
                  <option value="doubles">Doubles</option>
                </select>
              </label>
              {format.status === "dual" ? (
                <label className="text-xs text-text-secondary">
                  Lineup #
                  <input
                    value={row.lineupPosition}
                    onChange={(e) => updateRow(row.key, { lineupPosition: e.target.value })}
                    className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                    placeholder="1–6"
                  />
                </label>
              ) : (
                <>
                  <label className="text-xs text-text-secondary">
                    Draw
                    <input
                      value={row.drawName}
                      onChange={(e) => updateRow(row.key, { drawName: e.target.value })}
                      className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    Round
                    <input
                      value={row.roundLabel}
                      onChange={(e) => updateRow(row.key, { roundLabel: e.target.value })}
                      className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                      placeholder="R16, QF…"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    Flight
                    <input
                      value={row.flightName}
                      onChange={(e) => updateRow(row.key, { flightName: e.target.value })}
                      className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                    />
                  </label>
                </>
              )}
              <label className="text-xs text-text-secondary">
                Denison player
                <select
                  value={row.playerAId}
                  onChange={(e) => updateRow(row.key, { playerAId: e.target.value })}
                  className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                >
                  <option value="">Select…</option>
                  {roster.map((p) => (
                    <option key={p.id} value={p.id}>
                      {rosterPlayerDisplayName(p)}
                    </option>
                  ))}
                </select>
              </label>
              {row.discipline === "doubles" ? (
                <label className="text-xs text-text-secondary">
                  Partner
                  <select
                    value={row.playerBId}
                    onChange={(e) => updateRow(row.key, { playerBId: e.target.value })}
                    className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {roster.map((p) => (
                      <option key={p.id} value={p.id}>
                        {rosterPlayerDisplayName(p)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="text-xs text-text-secondary">
                Opponent
                <input
                  value={row.opponentA}
                  onChange={(e) => updateRow(row.key, { opponentA: e.target.value })}
                  className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                />
              </label>
              {row.discipline === "doubles" ? (
                <label className="text-xs text-text-secondary">
                  Opponent partner
                  <input
                    value={row.opponentB}
                    onChange={(e) => updateRow(row.key, { opponentB: e.target.value })}
                    className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                  />
                </label>
              ) : null}
              <label className="text-xs text-text-secondary">
                Opponent school
                <input
                  value={row.opponentSchool}
                  onChange={(e) => updateRow(row.key, { opponentSchool: e.target.value })}
                  className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                />
              </label>
              <label className="text-xs text-text-secondary">
                Score
                <input
                  value={row.scoreText}
                  onChange={(e) => updateRow(row.key, { scoreText: e.target.value })}
                  className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                  placeholder="6-4, 6-3"
                />
              </label>
              <label className="text-xs text-text-secondary">
                Status
                <select
                  value={row.status}
                  onChange={(e) =>
                    updateRow(row.key, { status: e.target.value as MatchResultStatus })
                  }
                  className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                >
                  <option value="completed">Completed</option>
                  <option value="retired">Retired</option>
                  <option value="walkover">Walkover</option>
                  <option value="default">Default</option>
                  <option value="unfinished">Unfinished</option>
                  <option value="bye">Bye</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label className="text-xs text-text-secondary">
                Outcome
                <select
                  value={row.winnerSide}
                  onChange={(e) =>
                    updateRow(row.key, { winnerSide: e.target.value as WinnerSide | "" })
                  }
                  className="mt-1 block h-9 w-full rounded-control border border-border bg-surface px-2 text-sm"
                >
                  <option value="denison">Denison win</option>
                  <option value="opponent">Opponent win</option>
                  <option value="unknown">Unknown</option>
                  <option value="">—</option>
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRows((current) => [...current, emptyRow("singles")])}
          className="h-9 rounded-control border border-border px-3 text-sm font-medium"
        >
          Add singles
        </button>
        <button
          type="button"
          onClick={() => setRows((current) => [...current, emptyRow("doubles")])}
          className="h-9 rounded-control border border-border px-3 text-sm font-medium"
        >
          Add doubles
        </button>
      </div>

      {validation && validation.errors.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
          {validation.errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !validation?.ok}
          onClick={() => void save()}
          className="h-10 rounded-control bg-[var(--module-accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save results"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-control border border-border px-4 text-sm font-medium"
          >
            Cancel
          </button>
        ) : null}
      </div>
      <p className="text-[11px] text-text-secondary">
        Opening or cancelling this form does not create results. Mark results complete is a separate
        action after entry.
      </p>
    </div>
  );
}
