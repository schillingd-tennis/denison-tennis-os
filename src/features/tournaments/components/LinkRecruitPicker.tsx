"use client";

import { useMemo, useState, useTransition } from "react";

import PlayerAvatar from "@/components/PlayerAvatar";
import SearchInput from "@/components/SearchInput";
import { modulePrimaryButtonClass } from "@/components/module-theme";
import type { RecruitDirectoryRow } from "@/features/recruiting/directory";
import { getDisplayName, getInitials } from "@/features/people/utils";
import { formatUtr } from "@/lib/formatting";

import { linkRecruitsAction } from "../actions";
import type { Tournament } from "../types";

export default function LinkRecruitPicker({
  tournamentId,
  linkedPersonIds,
  recruits,
  onCancel,
  onLinked,
}: {
  tournamentId: string;
  linkedPersonIds: readonly string[];
  recruits: RecruitDirectoryRow[];
  onCancel: () => void;
  onLinked: (tournament: Tournament) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const linked = useMemo(() => new Set(linkedPersonIds), [linkedPersonIds]);

  const available = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recruits.filter((row) => {
      if (linked.has(row.person.id)) return false;
      if (!needle) return true;
      const haystack = [
        getDisplayName(row.person),
        row.profile.recruitClassYear,
        row.profile.priority?.label,
        row.profile.pipelineStage?.label,
        row.person.utr,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [recruits, linked, query]);

  function toggle(personId: string) {
    setSelected((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId],
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await linkRecruitsAction(tournamentId, selected);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onLinked(result.tournament);
    });
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 space-y-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search recruits by name, class, or UTR"
          aria-label="Search recruits"
        />
        <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto rounded-card border border-border">
          {available.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-text-secondary">
              {linked.size > 0 && recruits.every((row) => linked.has(row.person.id))
                ? "Every current recruit is already linked."
                : "No matching recruits."}
            </li>
          ) : (
            available.map((row) => (
              <li key={row.person.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-app-background">
                  <input
                    type="checkbox"
                    checked={selected.includes(row.person.id)}
                    onChange={() => toggle(row.person.id)}
                    className="h-4 w-4 rounded border-border accent-[var(--module-accent)]"
                  />
                  <PlayerAvatar photoUrl={row.person.photoUrl} initials={getInitials(row.person)} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">{getDisplayName(row.person)}</span>
                    <span className="mt-0.5 block truncate text-xs text-text-secondary">
                      {[
                        row.profile.recruitClassYear ? `'${String(row.profile.recruitClassYear).slice(-2)}` : null,
                        row.person.utr != null ? `UTR ${formatUtr(row.person.utr)}` : null,
                        row.profile.priority?.label,
                        row.profile.pipelineStage?.label,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
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
        <button type="button" disabled={pending || selected.length === 0} className={modulePrimaryButtonClass} onClick={submit}>
          {pending ? "Linking…" : selected.length > 1 ? `Link ${selected.length} recruits` : "Link recruit"}
        </button>
      </div>
    </div>
  );
}
