"use client";

import { useMemo, useState, useTransition } from "react";

import { moduleFieldClass, modulePrimaryButtonClass } from "@/components/module-theme";
import type { RecruitDirectoryRow } from "@/features/recruiting/directory";
import { getDisplayName } from "@/features/people/utils";

import { saveTournamentAction } from "../actions";
import { emptyTournamentInput, tournamentToInput } from "../editor";
import type { Tournament, TournamentInput } from "../types";
import TournamentRecordFields from "./TournamentRecordFields";

export default function TournamentForm({
  tournament,
  recruits = [],
  onCancel,
  onSaved,
}: {
  tournament?: Tournament;
  recruits?: RecruitDirectoryRow[];
  onCancel: () => void;
  onSaved: (tournament: Tournament) => void;
}) {
  const [form, setForm] = useState<TournamentInput>(
    tournament ? tournamentToInput(tournament) : emptyTournamentInput(),
  );
  const linkedIds = useMemo(
    () => new Set(tournament?.linkedRecruits.map((recruit) => recruit.personId) ?? []),
    [tournament],
  );
  const [selectedRecruitIds, setSelectedRecruitIds] = useState<string[]>([]);
  const [recruitQuery, setRecruitQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const availableRecruits = useMemo(() => {
    const needle = recruitQuery.trim().toLowerCase();
    return recruits.filter((row) => {
      if (linkedIds.has(row.person.id)) return false;
      if (!needle) return true;
      return getDisplayName(row.person).toLowerCase().includes(needle);
    });
  }, [recruits, linkedIds, recruitQuery]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveTournamentAction(tournament?.id ?? null, form, selectedRecruitIds);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved(result.tournament);
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-full flex-col">
      <div className="flex-1 space-y-6">
        <TournamentRecordFields
          form={form}
          editing
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        />

        {!tournament && recruits.length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">Recruits</h3>
            <input
              className={moduleFieldClass}
              value={recruitQuery}
              onChange={(event) => setRecruitQuery(event.target.value)}
              placeholder="Search recruits to link"
              aria-label="Search recruits to link"
            />
            <ul className="max-h-48 overflow-y-auto rounded-control border border-border">
              {availableRecruits.slice(0, 12).map((row) => (
                <li key={row.person.id}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-app-background">
                    <input
                      type="checkbox"
                      checked={selectedRecruitIds.includes(row.person.id)}
                      onChange={() =>
                        setSelectedRecruitIds((current) =>
                          current.includes(row.person.id)
                            ? current.filter((id) => id !== row.person.id)
                            : [...current, row.person.id],
                        )
                      }
                    />
                    {getDisplayName(row.person)}
                    {row.profile.recruitClassYear ? (
                      <span className="text-xs text-text-secondary">{`'${String(row.profile.recruitClassYear).slice(-2)}`}</span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-border bg-surface pt-4 pb-1">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center rounded-control border border-border px-4 text-sm font-medium text-text-primary"
        >
          Cancel
        </button>
        <button type="submit" disabled={pending} className={modulePrimaryButtonClass}>
          {pending ? "Saving…" : tournament ? "Save changes" : "Add tournament"}
        </button>
      </div>
    </form>
  );
}
