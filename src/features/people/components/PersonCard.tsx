import Link from "next/link";
import { Mail, MessageSquare, Phone } from "lucide-react";

import { phoneHrefDigits } from "@/components/inline-edit";
import { typeClass, typeRole } from "@/components/typography";
import type { Person } from "@/features/people/types";
import {
  getDisplayFirstName,
  getHometown,
  getInitials,
  getPersonRoleDisplay,
  isCoachDirectoryPerson,
} from "@/features/people/utils";
import { EMPTY_VALUE, formatDisplay, formatUtr, formatWtn } from "@/lib/formatting";

import PlayerAvatar from "@/components/PlayerAvatar";
import QuickActionButton from "@/components/QuickActionButton";

/**
 * Team directory card (BP-025F / BP-027).
 * Directory facts only — administrative contact text lives in Workspace;
 * Call / Text / Email actions remain available here.
 */
export default function PersonCard({ person }: { person: Person }) {
  const hometown = getHometown(person);
  const email = person.denisonEmail ?? person.personalEmail;
  const phoneDigits = phoneHrefDigits(person.cellPhone);
  const coachDirectory = isCoachDirectoryPerson(person);
  const roleDisplay = getPersonRoleDisplay(person);
  const classLabel =
    !coachDirectory && person.classYear !== undefined
      ? `Class of ${person.classYear}`
      : undefined;
  const hasContact = Boolean(phoneDigits || email);
  const hasDetails = Boolean(hometown || classLabel);
  const utrDisplay = formatUtr(person.utr);
  const wtnDisplay = formatWtn(person.wtn);

  return (
    <div className="group relative flex h-full cursor-pointer flex-col gap-3.5 overflow-hidden rounded-card border border-border bg-surface px-5 py-5 transition-all duration-200 hover:border-text-secondary/25 hover:shadow-sm">
      <Link
        href={`/team/${person.id}`}
        className="absolute inset-0 rounded-card"
        aria-label={`Open workspace for ${getDisplayFirstName(person)} ${person.lastName}`}
      />

      <div className="flex min-w-0 items-center gap-2.5">
        <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={44} />
        <div className="min-w-0">
          <p className={typeRole.personName}>
            {getDisplayFirstName(person)} {person.lastName}
          </p>
          <p className={typeClass("metadataSm", "mt-0.5 truncate")}>
            {formatDisplay(roleDisplay)}
          </p>
        </div>
      </div>

      <div className={`flex flex-col gap-0.5 ${typeRole.metadata}`}>
        {hometown ? <p className="truncate">{hometown}</p> : null}
        {classLabel ? <p>{classLabel}</p> : null}
        {!hasDetails ? (
          <p className={typeRole.metadataEmpty}>No additional details yet</p>
        ) : null}
      </div>

      {!coachDirectory ? (
        <div className="grid grid-cols-2 gap-2 rounded-control bg-app-background px-3 py-2.5 text-center">
          <div>
            <p className={typeRole.sectionLabel}>UTR</p>
            <p
              className={`text-sm font-medium tabular-nums ${
                utrDisplay !== EMPTY_VALUE ? "text-text-primary" : typeRole.metadataEmpty
              }`}
            >
              {utrDisplay}
            </p>
          </div>
          <div>
            <p className={typeRole.sectionLabel}>WTN</p>
            <p
              className={`text-sm font-medium tabular-nums ${
                wtnDisplay !== EMPTY_VALUE ? "text-text-primary" : typeRole.metadataEmpty
              }`}
            >
              {wtnDisplay}
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
