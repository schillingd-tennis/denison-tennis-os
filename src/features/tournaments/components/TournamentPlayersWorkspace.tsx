"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronDown, UserPlus } from "lucide-react";

import PlayerAvatar from "@/components/PlayerAvatar";
import { EMPTY_VALUE, formatUtr } from "@/lib/formatting";
import { recruitingPersonPath } from "@/lib/module-routes";

import { unlinkRecruitAction } from "../actions";
import type { Tournament, TournamentLinkedRecruit } from "../types";
import TournamentRoadRoster from "./TournamentRoadRoster";

export default function TournamentPlayersWorkspace({
  tournament,
  pending,
  onAddPlayers,
  onUnlinked,
}: {
  tournament: Tournament;
  pending: boolean;
  onAddPlayers: () => void;
  onUnlinked: (tournament: Tournament) => void;
}) {
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [unlinkPending, startTransition] = useTransition();

  function unlink(recruit: TournamentLinkedRecruit) {
    if (!window.confirm(`Remove ${recruit.displayName} from this tournament? The recruit record will not be deleted.`)) {
      return;
    }
    setUnlinkingId(recruit.personId);
    startTransition(async () => {
      const result = await unlinkRecruitAction(tournament.id, recruit.personId);
      setUnlinkingId(null);
      if (!result.success) return;
      onUnlinked(result.tournament);
    });
  }

  return (
    <div className="min-w-0 space-y-[10px]">
      <TournamentRoadRoster tournamentId={tournament.id} initialParticipants={tournament.participants} />
      <details className="group rounded-card border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">
              Linked to Recruiting OS: {tournament.linkedRecruits.length}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Existing recruit connections are already identified in Tournament Players above.
            </p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <section aria-label="Linked recruiting profiles" className="border-t border-border px-4 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">Use this only to review connections or manually link an existing recruit who was not matched from the imported field.</p>
          <button
            type="button"
            onClick={onAddPlayers}
            className="inline-flex h-9 min-w-max shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-border bg-surface px-3 text-xs font-semibold text-text-primary hover:border-denison-red hover:text-denison-red"
          >
            <UserPlus className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Link existing recruit
          </button>
          </div>
        {tournament.linkedRecruits.length === 0 ? (
          <p className="text-sm text-text-secondary">No recruits linked yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tournament.linkedRecruits.map((recruit) => (
              <li key={recruit.personId} className="py-2">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={recruitingPersonPath(recruit.personId)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 hover:opacity-80"
                  >
                    <PlayerAvatar photoUrl={recruit.photoUrl} initials={recruit.initials} size={32} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text-primary">
                        {recruit.displayName}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-text-secondary">
                        {[
                          recruit.recruitClassYear ? `'${String(recruit.recruitClassYear).slice(-2)}` : null,
                          recruit.hometown,
                          recruit.utr != null ? `UTR ${formatUtr(recruit.utr)}` : null,
                          recruit.trnRank != null ? `TRN ${recruit.trnRank}` : null,
                          recruit.pipelineLabel,
                          recruit.priorityLabel,
                        ]
                          .filter(Boolean)
                          .join(" · ") || EMPTY_VALUE}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => unlink(recruit)}
                    disabled={pending || unlinkPending}
                    className="shrink-0 text-xs font-medium text-text-secondary hover:text-danger"
                  >
                    {unlinkingId === recruit.personId ? "Removing…" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        </section>
      </details>
    </div>
  );
}
