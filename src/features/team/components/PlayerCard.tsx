import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import type { Person } from "@/features/people/types";
import {
  getDisplayFirstName,
  getHometown,
  getInitials,
  getStatusLabel,
  getStatusTone,
} from "@/features/people/utils";

import PlayerAvatar from "@/components/PlayerAvatar";
import StatusBadge from "@/components/StatusBadge";

export default function PlayerCard({ person }: { person: Person }) {
  const hometown = getHometown(person);
  const email = person.denisonEmail ?? person.personalEmail;

  return (
    <div className="group relative flex h-full flex-col gap-4 rounded-card border border-border bg-surface p-5 transition-shadow hover:shadow-sm">
      <Link
        href={`/team/${person.id}`}
        className="absolute inset-0 rounded-card"
        aria-label={`Open workspace for ${getDisplayFirstName(person)} ${person.lastName}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={44} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-text-primary">
              {getDisplayFirstName(person)} {person.lastName}
            </p>
            {person.classYear ? (
              <p className="text-sm text-text-secondary">Class of {person.classYear}</p>
            ) : null}
          </div>
        </div>
        <StatusBadge label={getStatusLabel(person.status)} tone={getStatusTone(person.status)} />
      </div>

      <div className="flex flex-col gap-1 text-sm text-text-secondary">
        {hometown ? <p>{hometown}</p> : null}
        {person.major ? <p>{person.major}</p> : null}
        {person.utr !== undefined ? (
          <p className="font-medium text-text-primary">UTR {person.utr.toFixed(1)}</p>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
        <div className="relative z-10 flex items-center gap-1">
          {person.cellPhone ? (
            <a
              href={`tel:${person.cellPhone}`}
              aria-label="Call"
              className="flex h-8 w-8 items-center justify-center rounded-control text-text-secondary hover:bg-app-background hover:text-denison-red"
            >
              <Phone className="h-4 w-4" strokeWidth={1.75} />
            </a>
          ) : null}
          {email ? (
            <a
              href={`mailto:${email}`}
              aria-label="Email"
              className="flex h-8 w-8 items-center justify-center rounded-control text-text-secondary hover:bg-app-background hover:text-denison-red"
            >
              <Mail className="h-4 w-4" strokeWidth={1.75} />
            </a>
          ) : null}
        </div>

        <span className="relative z-10 text-sm font-medium text-denison-red group-hover:underline">
          Open Workspace →
        </span>
      </div>
    </div>
  );
}
