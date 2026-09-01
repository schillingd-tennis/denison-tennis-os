"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelRecruitUpcomingTournamentAction,
  saveRecruitUpcomingTournamentAction,
} from "../actions";
import type { RecruitUpcomingTournament, RecruitUpcomingTournamentInput } from "../types";

const INPUT_CLASS =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-primary";

function emptyForm(recruitPersonId: string): RecruitUpcomingTournamentInput {
  return {
    recruitPersonId,
    tournamentName: "",
    startDate: "",
    endDate: null,
    location: null,
    eventType: null,
    sourceUrl: null,
    notes: null,
    source: "MANUAL",
    status: "UPCOMING",
  };
}

function formFromTournament(tournament: RecruitUpcomingTournament): RecruitUpcomingTournamentInput {
  return {
    recruitPersonId: tournament.recruitPersonId,
    tournamentName: tournament.tournamentName,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    location: tournament.location,
    eventType: tournament.eventType,
    sourceUrl: tournament.sourceUrl,
    notes: tournament.notes,
    source: tournament.source,
    status: tournament.status,
  };
}

export default function UpcomingTournamentForm({
  recruitPersonId,
  recruitName,
  tournament,
  onClose,
}: {
  recruitPersonId: string;
  recruitName: string;
  tournament?: RecruitUpcomingTournament;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<RecruitUpcomingTournamentInput>(
    tournament ? formFromTournament(tournament) : emptyForm(recruitPersonId),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof RecruitUpcomingTournamentInput>(
    key: K,
    value: RecruitUpcomingTournamentInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveRecruitUpcomingTournamentAction({
        id: tournament?.id ?? null,
        tournament: form,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  function handleCancelTournament() {
    if (!tournament?.id) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelRecruitUpcomingTournamentAction(tournament.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Manual upcoming tournament for{" "}
        <span className="font-medium text-text-primary">{recruitName}</span>.
      </p>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Tournament Name
        </span>
        <input
          className={INPUT_CLASS}
          value={form.tournamentName}
          onChange={(event) => updateField("tournamentName", event.target.value)}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Start Date
          </span>
          <input
            type="date"
            className={INPUT_CLASS}
            value={form.startDate}
            onChange={(event) => updateField("startDate", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            End Date
          </span>
          <input
            type="date"
            className={INPUT_CLASS}
            value={form.endDate ?? ""}
            onChange={(event) => updateField("endDate", event.target.value || null)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Location
        </span>
        <input
          className={INPUT_CLASS}
          value={form.location ?? ""}
          onChange={(event) => updateField("location", event.target.value || null)}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Event Type
        </span>
        <input
          className={INPUT_CLASS}
          value={form.eventType ?? ""}
          onChange={(event) => updateField("eventType", event.target.value || null)}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Source URL
        </span>
        <input
          className={INPUT_CLASS}
          value={form.sourceUrl ?? ""}
          onChange={(event) => updateField("sourceUrl", event.target.value || null)}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Notes
        </span>
        <textarea
          className={`${INPUT_CLASS} min-h-[72px] resize-y`}
          value={form.notes ?? ""}
          onChange={(event) => updateField("notes", event.target.value || null)}
        />
      </label>

      {error ? (
        <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-control bg-[var(--module-accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
          onClick={handleSave}
          disabled={isPending || !form.tournamentName.trim() || !form.startDate}
        >
          {tournament ? "Save Tournament" : "Add Tournament"}
        </button>
        {tournament ? (
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-control border border-red-200 px-4 text-sm font-semibold text-red-700 disabled:opacity-50"
            onClick={handleCancelTournament}
            disabled={isPending}
          >
            Cancel Tournament
          </button>
        ) : null}
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-control border border-border px-4 text-sm font-semibold text-text-primary"
          onClick={onClose}
          disabled={isPending}
        >
          Close
        </button>
      </div>
    </div>
  );
}
