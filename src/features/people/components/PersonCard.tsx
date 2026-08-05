import Link from "next/link";
import { Mail, MessageSquare, Phone } from "lucide-react";

import { formatPhoneDisplay, phoneHrefDigits } from "@/components/inline-edit";
import type { Person } from "@/features/people/types";
import {
  formatDenisonIdDisplay,
  getDisplayFirstName,
  getHometown,
  getInitials,
  getPlayerStatusLabel,
  getStatusAccentTone,
  getStatusLabel,
  isCoachDirectoryPerson,
} from "@/features/people/utils";
import { getPersonStatusIndicator } from "@/features/people/statusIndicator";

import CardAccentBar from "@/components/CardAccentBar";
import PlayerAvatar from "@/components/PlayerAvatar";
import QuickActionButton from "@/components/QuickActionButton";
import StatusDot from "@/components/StatusDot";

import PersonRoleBadge from "./PersonRoleBadge";
import PersonStatusLabel from "./PersonStatusLabel";

function formatRating(value: number | undefined): string {
  return value !== undefined ? value.toFixed(1) : "—";
}

export default function PersonCard({ person }: { person: Person }) {
  const hometown = getHometown(person);
  const email = person.denisonEmail ?? person.personalEmail;
  const phoneDigits = phoneHrefDigits(person.cellPhone);
  const phoneDisplay = formatPhoneDisplay(person.cellPhone);
  const coachDirectory = isCoachDirectoryPerson(person);
  const playerStatusLabel =
    !coachDirectory && person.status === "current"
      ? getPlayerStatusLabel(person.playerStatus)
      : undefined;
  const statusIndicator = getPersonStatusIndicator(person);
  const showDenisonId = !coachDirectory || Boolean(person.denisonId?.trim());
  const hasContact = Boolean(phoneDigits || email);

  return (
    <div className="group relative flex h-full cursor-pointer flex-col gap-3.5 overflow-hidden rounded-card border border-border bg-surface px-5 py-5 pl-6 transition-all duration-200 hover:border-text-secondary/25 hover:shadow-sm">
      <CardAccentBar tone={getStatusAccentTone(person.status)} />

      <Link
        href={`/team/${person.id}`}
        className="absolute inset-0 rounded-card"
        aria-label={`Open workspace for ${getDisplayFirstName(person)} ${person.lastName}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusDot tone={statusIndicator.tone} label={statusIndicator.label} />
          <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={44} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-text-primary">
              {getDisplayFirstName(person)} {person.lastName}
            </p>
            <PersonRoleBadge person={person} className="mt-1" />
            {showDenisonId ? (
              <p className="mt-1 truncate text-xs text-text-secondary tabular-nums">
                {formatDenisonIdDisplay(person.denisonId)}
              </p>
            ) : null}
          </div>
        </div>
        <PersonStatusLabel
          tone={person.status === "alumni" ? "alumni" : "active"}
          label={getStatusLabel(person.status)}
        />
      </div>

      <div className="flex flex-col gap-0.5 text-sm text-text-secondary">
        {hometown ? <p className="truncate">{hometown}</p> : null}
        {coachDirectory ? (
          <>
            {phoneDisplay ? <p className="tabular-nums">{phoneDisplay}</p> : null}
            {email ? <p className="truncate">{email}</p> : null}
          </>
        ) : (
          <>
            {person.major ? <p className="truncate">{person.major}</p> : null}
            {playerStatusLabel && playerStatusLabel !== "—" ? <p>{playerStatusLabel}</p> : null}
          </>
        )}
        {!hometown &&
        !(coachDirectory ? phoneDisplay || email : person.major || playerStatusLabel) ? (
          <p className="text-text-secondary/55">No additional details yet</p>
        ) : null}
      </div>

      {!coachDirectory ? (
        <div className="grid grid-cols-2 gap-2 rounded-control bg-app-background px-3 py-2.5 text-center">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-text-secondary uppercase">UTR</p>
            <p
              className={`text-sm font-medium tabular-nums ${
                person.utr !== undefined ? "text-text-primary" : "text-text-secondary/45"
              }`}
            >
              {formatRating(person.utr)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-text-secondary uppercase">WTN</p>
            <p
              className={`text-sm font-medium tabular-nums ${
                person.wtn !== undefined ? "text-text-primary" : "text-text-secondary/45"
              }`}
            >
              {formatRating(person.wtn)}
            </p>
          </div>
        </div>
      ) : null}

      {hasContact ? (
        <div className="relative z-10 mt-auto flex items-center justify-end gap-1.5 pt-0.5">
          {phoneDigits ? (
            <>
              <QuickActionButton href={`tel:${phoneDigits}`} icon={Phone} label="Call" tone="success" />
              <QuickActionButton
                href={`sms:${phoneDigits}`}
                icon={MessageSquare}
                label="Text"
                tone="denison"
              />
            </>
          ) : null}
          {email ? (
            <QuickActionButton href={`mailto:${email}`} icon={Mail} label="Email" tone="info" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
