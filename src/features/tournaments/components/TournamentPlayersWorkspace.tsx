"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { UserPlus, Users } from "lucide-react";

import {
  WorkspaceAccentHeading,
  WorkspaceFieldGrid,
} from "@/components/adaptive-workspace";
import PlayerAvatar from "@/components/PlayerAvatar";
import { EMPTY_VALUE, formatUtr } from "@/lib/formatting";
import { recruitingPersonPath } from "@/lib/module-routes";

import { unlinkRecruitAction } from "../actions";
import type { Tournament, TournamentLinkedRecruit } from "../types";
import { TournamentImportedRecruitsWorkspaceField } from "./TournamentWorkspaceFields";

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
      <section aria-label="The Players">
        <div className="mb-2 flex flex-nowrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <WorkspaceAccentHeading icon={Users} tone="warning">
              The Players
            </WorkspaceAccentHeading>
          </div>
          <button
            type="button"
            onClick={onAddPlayers}
            className="inline-flex h-11 min-w-max shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control bg-denison-red px-5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_18px_rgba(200,16,46,0.28)] transition-opacity hover:opacity-90"
          >
            <UserPlus className="h-4 w-4 shrink-0 text-white" strokeWidth={1.75} aria-hidden />
            Add Players
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
      <div className="border-t border-border/50 pt-[10px]">
        <WorkspaceFieldGrid columns={2} className="tournament-field-grid-2">
          <TournamentImportedRecruitsWorkspaceField />
        </WorkspaceFieldGrid>
      </div>
    </div>
  );
}
