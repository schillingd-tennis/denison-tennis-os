import Link from "next/link";
import { ArrowRight, Mail, Phone } from "lucide-react";

import type { Person } from "@/features/people/types";
import {
  getDisplayFirstName,
  getHometown,
  getInitials,
  getStatusLabel,
  getStatusTone,
} from "@/features/people/utils";

import ContactAction from "@/components/ContactAction";
import PlayerAvatar from "@/components/PlayerAvatar";
import StatusBadge from "@/components/StatusBadge";

export default function PlayerCard({ person }: { person: Person }) {
  const hometown = getHometown(person);
  const email = person.denisonEmail ?? person.personalEmail;

  return (
    <div className="group relative flex h-full flex-col gap-5 rounded-card border border-border bg-surface p-6 transition-colors duration-150 hover:border-text-secondary/30">
      <Link
        href={`/team/${person.id}`}
        className="absolute inset-0 rounded-card"
        aria-label={`Open workspace for ${getDisplayFirstName(person)} ${person.lastName}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={48} />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-text-primary">
              {getDisplayFirstName(person)} {person.lastName}
            </p>
            {person.classYear ? (
              <p className="mt-0.5 text-xs text-text-secondary">Class of {person.classYear}</p>
            ) : null}
          </div>
        </div>
        <StatusBadge label={getStatusLabel(person.status)} tone={getStatusTone(person.status)} />
      </div>

      <div className="flex flex-col gap-1 text-sm text-text-secondary">
        {hometown ? <p>{hometown}</p> : null}
        {person.major ? <p>{person.major}</p> : null}
        {person.utr !== undefined ? (
          <p className="text-text-primary">UTR {person.utr.toFixed(1)}</p>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between pt-1">
        <div className="relative z-10 flex items-center gap-1">
          <ContactAction
            variant="icon"
            href={person.cellPhone ? `tel:${person.cellPhone}` : undefined}
            icon={Phone}
            label="Call"
          />
          <ContactAction
            variant="icon"
            href={email ? `mailto:${email}` : undefined}
            icon={Mail}
            label="Email"
          />
        </div>

        <span className="relative z-10 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors duration-150 group-hover:text-denison-red">
          Open Workspace
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}
