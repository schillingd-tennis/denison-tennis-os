import type { ReactNode } from "react";
import { Mail, MessageSquare, Phone, StickyNote } from "lucide-react";

import PlayerAvatar from "@/components/PlayerAvatar";
import QuickActionButton from "@/components/QuickActionButton";
import { typeClass, typeRole } from "@/components/typography";
import type { Person } from "@/features/people/types";
import {
  getFullDisplayName,
  getHometown,
  getInitials,
  getPersonRoleDisplay,
  getStatusLabel,
  isCoachDirectoryPerson,
} from "@/features/people/utils";
import { EMPTY_VALUE, formatDisplay, formatUtr, formatWtn } from "@/lib/formatting";
import { formatPhoneDisplay, phoneHrefDigits } from "@/components/inline-edit";

const NO_DATA = "No data";

function HeaderFact({ label, value }: { label: string; value: string }) {
  const empty = value === EMPTY_VALUE || value === NO_DATA || value.trim() === "";
  return (
    <div className="min-w-0">
      <dt className={typeRole.sectionLabel}>{label}</dt>
      <dd
        className={`mt-1 truncate ${empty ? typeRole.metadataEmpty : typeRole.fieldValue}`}
      >
        {empty ? NO_DATA : value}
      </dd>
    </div>
  );
}

/**
 * Shared Person identity header (BP-031B).
 * Display-only facts + quick actions. Optional slots preserve workspace inline edits.
 */
export default function PersonHeader({
  person,
  statusSlot,
  roleSlot,
  playerStatusSlot,
  onAddNote,
  className,
}: {
  person: Person;
  /** When set, replaces the read-only Status fact (e.g. InlineEditCell). */
  statusSlot?: ReactNode;
  roleSlot?: ReactNode;
  playerStatusSlot?: ReactNode;
  onAddNote?: () => void;
  className?: string;
}) {
  const fullName = getFullDisplayName(person);
  const preferred =
    person.preferredName?.trim() &&
    person.preferredName.trim() !== person.firstName.trim()
      ? person.preferredName.trim()
      : undefined;
  const hometown = getHometown(person);
  const coachDirectory = isCoachDirectoryPerson(person);
  const roleDisplay = getPersonRoleDisplay(person);
  const phoneDigits = phoneHrefDigits(person.cellPhone);
  const phoneDisplay = formatPhoneDisplay(person.cellPhone);
  const email = person.denisonEmail ?? person.personalEmail;
  const tel = phoneDigits ? `tel:${phoneDigits}` : undefined;
  const sms = phoneDigits ? `sms:${phoneDigits}` : undefined;
  const mailto = email ? `mailto:${email}` : undefined;
  const classYear =
    !coachDirectory && person.classYear !== undefined
      ? `Class of ${person.classYear}`
      : NO_DATA;
  const utr = coachDirectory ? NO_DATA : formatUtr(person.utr);
  const wtn = coachDirectory ? NO_DATA : formatWtn(person.wtn);

  return (
    <section
      className={`rounded-card border border-border bg-surface px-6 py-6 ${className ?? ""}`}
      aria-label="Person header"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <PlayerAvatar
              photoUrl={person.photoUrl}
              initials={getInitials(person)}
              size={72}
            />
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className={typeRole.personNameHero}>{fullName}</h1>
              {preferred ? (
                <p className={typeClass("identityMeta")}>Preferred: {preferred}</p>
              ) : null}
              {(statusSlot || roleSlot || playerStatusSlot) && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {statusSlot}
                  {roleSlot}
                  {playerStatusSlot}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <QuickActionButton href={tel} icon={Phone} label="Call" tone="success" />
            <QuickActionButton href={sms} icon={MessageSquare} label="Text" tone="denison" />
            <QuickActionButton href={mailto} icon={Mail} label="Email" tone="info" />
            <QuickActionButton
              onAction={onAddNote}
              icon={StickyNote}
              label="Add Note"
              tone="neutral"
              unavailableTitle="Add Note unavailable"
            />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {!statusSlot ? (
            <HeaderFact label="Status" value={formatDisplay(getStatusLabel(person))} />
          ) : null}
          {!roleSlot ? <HeaderFact label="Role" value={formatDisplay(roleDisplay)} /> : null}
          <HeaderFact label="Graduation Class" value={classYear} />
          <HeaderFact label="UTR" value={utr === EMPTY_VALUE ? NO_DATA : utr} />
          <HeaderFact label="WTN" value={wtn === EMPTY_VALUE ? NO_DATA : wtn} />
          <HeaderFact label="Hometown" value={formatDisplay(hometown)} />
          <HeaderFact
            label="Major"
            value={coachDirectory ? NO_DATA : formatDisplay(person.major)}
          />
          <HeaderFact
            label="Cell Phone"
            value={phoneDisplay?.trim() ? phoneDisplay : NO_DATA}
          />
          <HeaderFact label="Email" value={formatDisplay(email)} />
        </dl>
      </div>
    </section>
  );
}
