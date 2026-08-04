import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare, Phone, type LucideIcon } from "lucide-react";

import type { Person } from "@/features/people/types";
import {
  getInitials,
  getPermanentAddress,
  getPlayerStatusLabel,
  getStatusLabel,
  getStatusTone,
} from "@/features/people/utils";

import PlayerAvatar from "@/components/PlayerAvatar";
import StatusBadge from "@/components/StatusBadge";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-text-secondary uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-text-primary">{value}</dd>
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
}: {
  href?: string;
  icon: LucideIcon;
  label: string;
}) {
  if (!href) {
    return (
      <span className="flex items-center gap-2 rounded-control border border-border px-3 py-2.5 text-sm font-medium text-text-secondary opacity-50">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
        {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-control border border-border px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-denison-red hover:text-denison-red"
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
      {label}
    </a>
  );
}

export default function PlayerWorkspace({ person }: { person: Person }) {
  const fullName =
    person.preferredName && person.preferredName !== person.firstName
      ? `${person.firstName} "${person.preferredName}" ${person.lastName}`
      : `${person.firstName} ${person.lastName}`;

  const dormLine = person.dorm
    ? [person.dorm, person.roomNumber ? `Room ${person.roomNumber}` : null]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  const email = person.denisonEmail ?? person.personalEmail;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link
        href="/team"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Back to Team
      </Link>

      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={64} />
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{fullName}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {[person.classYear ? `Class of ${person.classYear}` : null, person.major]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <StatusBadge label={getStatusLabel(person.status)} tone={getStatusTone(person.status)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-primary">Quick Information</h2>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <InfoItem label="Cell Phone" value={person.cellPhone} />
            <InfoItem label="Personal Email" value={person.personalEmail} />
            <InfoItem label="Denison Email" value={person.denisonEmail} />
            <InfoItem label="Dorm & Room" value={dormLine} />
            <InfoItem label="Denison ID" value={person.denisonId} />
            <InfoItem label="Date of Birth" value={person.dateOfBirth} />
            <InfoItem label="Permanent Address" value={getPermanentAddress(person)} />
            <InfoItem label="UTR" value={person.utr?.toFixed(1)} />
            <InfoItem label="WTN" value={person.wtn?.toFixed(1)} />
            <InfoItem
              label="Dominant Hand"
              value={person.dominantHand ? capitalize(person.dominantHand) : undefined}
            />
            <InfoItem
              label="Player Status"
              value={person.playerStatus ? getPlayerStatusLabel(person.playerStatus) : undefined}
            />
          </dl>
        </div>

        <div className="rounded-card border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-text-primary">Quick Actions</h2>
          <div className="mt-4 flex flex-col gap-2">
            <ActionLink
              href={person.cellPhone ? `tel:${person.cellPhone}` : undefined}
              icon={Phone}
              label="Call"
            />
            <ActionLink
              href={person.cellPhone ? `sms:${person.cellPhone}` : undefined}
              icon={MessageSquare}
              label="Text"
            />
            <ActionLink href={email ? `mailto:${email}` : undefined} icon={Mail} label="Email" />
          </div>
        </div>
      </div>

      <div className="rounded-card border border-dashed border-border p-6 text-center text-sm text-text-secondary">
        Player activity, documents, travel, academics, and performance will be
        added in future sprints.
      </div>
    </div>
  );
}
