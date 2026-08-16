"use client";

import Link from "next/link";
import { Mail, MessageSquare, Phone } from "lucide-react";

import { phoneHrefDigits } from "@/components/inline-edit";
import PlayerAvatar from "@/components/PlayerAvatar";
import QuickActionButton from "@/components/QuickActionButton";
import { typeClass, typeRole } from "@/components/typography";
import { getDisplayName, getInitials } from "@/features/people/utils";
import { EMPTY_VALUE, formatDisplay, formatUtr, formatWtn } from "@/lib/formatting";

import type { RecruitDirectoryRow } from "../directory";

export default function RecruitCard({ row }: { row: RecruitDirectoryRow }) {
  const { person, profile, analytics } = row;
  const email = person.personalEmail ?? person.denisonEmail;
  const phoneDigits = phoneHrefDigits(person.cellPhone);
  const classLabel =
    profile.recruitClassYear !== undefined ? `Class of ${profile.recruitClassYear}` : undefined;
  const pipeline = profile.pipelineStage?.label;
  const tier = analytics.tier;
  const utrDisplay = formatUtr(person.utr);
  const wtnDisplay = formatWtn(person.wtn);

  return (
    <div className="group relative flex h-full cursor-pointer flex-col gap-3.5 overflow-hidden rounded-card border border-border bg-surface px-5 py-5 transition-all duration-200 hover:border-text-secondary/25 hover:shadow-sm">
      <Link
        href={`/recruiting/${person.id}`}
        className="absolute inset-0 rounded-card"
        aria-label={`Open recruiting workspace for ${getDisplayName(person)}`}
      />

      <div className="flex min-w-0 items-center gap-2.5">
        <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={44} />
        <div className="min-w-0">
          <p className={typeRole.personName}>{getDisplayName(person)}</p>
          <p className={typeClass("metadataSm", "mt-0.5 truncate")}>
            {[classLabel, pipeline].filter(Boolean).join(" · ") || EMPTY_VALUE}
          </p>
        </div>
      </div>

      <div className={`flex flex-col gap-0.5 ${typeRole.metadata}`}>
        {tier ? <p>{tier}</p> : <p className={typeRole.metadataEmpty}>Not in analytics pool</p>}
        {profile.priority?.label ? <p>{profile.priority.label}</p> : null}
      </div>

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

      <div className="relative z-10 mt-auto flex items-center gap-1 pt-1">
        {phoneDigits ? (
          <QuickActionButton href={`tel:${phoneDigits}`} icon={Phone} label="Call" tone="success" />
        ) : null}
        {phoneDigits ? (
          <QuickActionButton href={`sms:${phoneDigits}`} icon={MessageSquare} label="Text" tone="denison" />
        ) : null}
        {email ? (
          <QuickActionButton href={`mailto:${email}`} icon={Mail} label="Email" tone="info" />
        ) : null}
        {!phoneDigits && !email ? (
          <span className={typeRole.metadataEmpty}>{formatDisplay(undefined)}</span>
        ) : null}
      </div>
    </div>
  );
}
