import Link from "next/link";
import { Mail, MessageSquare, Phone } from "lucide-react";

import { phoneHrefDigits } from "@/components/inline-edit";
import type { Person } from "@/features/people/types";
import {
  getDisplayFirstName,
  getHometown,
  getInitials,
  getPlayerStatusLabel,
  getStatusAccentTone,
  getStatusLabel,
  getStatusTone,
} from "@/features/people/utils";

import CardAccentBar from "@/components/CardAccentBar";
import PlayerAvatar from "@/components/PlayerAvatar";
import QuickActionButton from "@/components/QuickActionButton";
import StatusBadge from "@/components/StatusBadge";

/** Formats a rating value for the compact ratings row, or a muted dash if unset. */
function formatRating(value: number | undefined): string {
  return value !== undefined ? value.toFixed(1) : "—";
}

export default function PlayerCard({ person }: { person: Person }) {
  const hometown = getHometown(person);
  const email = person.denisonEmail ?? person.personalEmail;
  const phoneDigits = phoneHrefDigits(person.cellPhone);
  const playerStatusLabel =
    person.status === "current" ? getPlayerStatusLabel(person.playerStatus) : undefined;

  return (
    <div className="group relative flex h-full cursor-pointer flex-col gap-4 overflow-hidden rounded-card border border-border bg-surface py-6 pr-6 pl-7 transition-all duration-200 hover:border-text-secondary/30 hover:shadow-md">
      <CardAccentBar tone={getStatusAccentTone(person.status)} />

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
        {person.major ? <p className="truncate">{person.major}</p> : null}
        {playerStatusLabel && playerStatusLabel !== "—" ? <p>{playerStatusLabel}</p> : null}
        {!hometown && !person.major && !playerStatusLabel ? (
          <p className="text-text-secondary/60">No additional details yet</p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-control bg-app-background px-3 py-2 text-center">
        <div>
          <p className="text-[10px] font-medium tracking-wide text-text-secondary uppercase">UTR</p>
          <p
            className={`text-sm font-medium ${person.utr !== undefined ? "text-text-primary" : "text-text-secondary/50"}`}
          >
            {formatRating(person.utr)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium tracking-wide text-text-secondary uppercase">WTN</p>
          <p
            className={`text-sm font-medium ${person.wtn !== undefined ? "text-text-primary" : "text-text-secondary/50"}`}
          >
            {formatRating(person.wtn)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium tracking-wide text-text-secondary uppercase">TRN</p>
          <p className="text-sm font-medium text-text-secondary/50">—</p>
        </div>
      </div>

      <div className="relative z-10 mt-auto flex items-center justify-end gap-2 pt-1">
        <QuickActionButton
          href={phoneDigits ? `tel:${phoneDigits}` : undefined}
          icon={Phone}
          label="Call"
          tone="success"
        />
        <QuickActionButton
          href={phoneDigits ? `sms:${phoneDigits}` : undefined}
          icon={MessageSquare}
          label="Text"
          tone="denison"
        />
        <QuickActionButton
          href={email ? `mailto:${email}` : undefined}
          icon={Mail}
          label="Email"
          tone="info"
        />
      </div>
    </div>
  );
}
