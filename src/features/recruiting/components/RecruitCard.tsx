"use client";

import Link from "next/link";

import CardAccentBar from "@/components/CardAccentBar";
import ContactActionSlots from "@/components/ContactActionSlots";
import { InlineEditCell, phoneHrefDigits } from "@/components/inline-edit";
import PlayerAvatar from "@/components/PlayerAvatar";
import { typeClass, typeRole } from "@/components/typography";
import { getDisplayName, getInitials } from "@/features/people/utils";
import { EMPTY_VALUE, formatUtr, formatWtn } from "@/lib/formatting";

import type { RecruitDirectoryRow } from "../directory";
import {
  GETABILITY_SELECT_OPTIONS,
  INTEREST_SELECT_OPTIONS,
  PIPELINE_SELECT_OPTIONS,
  PRIORITY_SELECT_OPTIONS,
} from "../directoryInline";
import { useRecruitDirectoryInlineEdit } from "../useRecruitDirectoryInlineEdit";
import RecruitStatusBadge from "./RecruitStatusBadge";
import {
  getabilityTone,
  interestTone,
  pipelineCardAccent,
  pipelineTone,
  priorityTone,
} from "./statusPresentation";

export default function RecruitCard({
  row,
  cohort,
  onCohortChange,
}: {
  row: RecruitDirectoryRow;
  cohort: RecruitDirectoryRow[];
  onCohortChange: (rows: RecruitDirectoryRow[]) => void;
}) {
  const { person, profile } = row;
  const personId = person.id;
  const email = person.personalEmail ?? person.denisonEmail;
  const phoneDigits = phoneHrefDigits(person.cellPhone);
  const classLabel =
    profile.recruitClassYear !== undefined ? `Class of ${profile.recruitClassYear}` : undefined;
  const utrDisplay = formatUtr(person.utr);
  const wtnDisplay = formatWtn(person.wtn);
  const { isEditing, startEdit, cancelEdit, commit, fieldError } = useRecruitDirectoryInlineEdit({
    cohort,
    onCohortChange,
  });

  return (
    <div className="group relative flex h-full flex-col gap-3.5 overflow-hidden rounded-card border border-black/[0.06] bg-surface px-5 py-5 shadow-[0_8px_24px_rgba(17,24,39,0.03)] transition-[border-color,box-shadow] duration-200 hover:border-[var(--module-accent)]/25 hover:shadow-[0_10px_24px_rgba(17,24,39,0.06)]">
      <CardAccentBar tone={pipelineCardAccent(profile.pipelineStage?.key)} />

      <Link
        href={`/recruiting/${person.id}`}
        className="relative z-10 flex min-w-0 items-center gap-2.5 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-[var(--module-accent)]/40"
        aria-label={`Open recruiting workspace for ${getDisplayName(person)}`}
      >
        <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={44} />
        <div className="min-w-0">
          <p className={typeRole.personName}>{getDisplayName(person)}</p>
          <p className={typeClass("metadataSm", "mt-0.5 truncate")}>
            {classLabel ?? EMPTY_VALUE}
          </p>
        </div>
      </Link>

      <div className="relative z-10 flex flex-wrap gap-1.5">
        <InlineEditCell
          label="Pipeline"
          type="select"
          options={PIPELINE_SELECT_OPTIONS}
          value={profile.pipelineStageId ?? ""}
          editOn="click"
          editing={isEditing(personId, "pipelineStage")}
          error={isEditing(personId, "pipelineStage") ? fieldError : undefined}
          className="relative z-10 !mx-0 !px-0 !py-0"
          renderDisplay={
            <RecruitStatusBadge
              label={profile.pipelineStage?.label}
              tone={pipelineTone(profile.pipelineStage?.key)}
            />
          }
          onRequestEdit={() => startEdit(personId, "pipelineStage")}
          onCancel={cancelEdit}
          onCommit={(raw, reason) => commit(personId, "pipelineStage", raw, reason)}
        />
        <InlineEditCell
          label="Interest"
          type="select"
          options={INTEREST_SELECT_OPTIONS}
          value={profile.interestId ?? ""}
          editOn="click"
          editing={isEditing(personId, "interest")}
          error={isEditing(personId, "interest") ? fieldError : undefined}
          className="relative z-10 !mx-0 !px-0 !py-0"
          renderDisplay={
            <RecruitStatusBadge
              label={profile.interest?.label}
              tone={interestTone(profile.interest?.key)}
            />
          }
          onRequestEdit={() => startEdit(personId, "interest")}
          onCancel={cancelEdit}
          onCommit={(raw, reason) => commit(personId, "interest", raw, reason)}
        />
        <InlineEditCell
          label="Priority"
          type="select"
          options={PRIORITY_SELECT_OPTIONS}
          value={profile.priorityId ?? ""}
          editOn="click"
          editing={isEditing(personId, "priority")}
          error={isEditing(personId, "priority") ? fieldError : undefined}
          className="relative z-10 !mx-0 !px-0 !py-0"
          renderDisplay={
            <RecruitStatusBadge
              label={profile.priority?.label}
              tone={priorityTone(profile.priority?.key)}
            />
          }
          onRequestEdit={() => startEdit(personId, "priority")}
          onCancel={cancelEdit}
          onCommit={(raw, reason) => commit(personId, "priority", raw, reason)}
        />
        <InlineEditCell
          label="Getability"
          type="select"
          options={GETABILITY_SELECT_OPTIONS}
          value={profile.getabilityId ?? ""}
          editOn="click"
          editing={isEditing(personId, "getability")}
          error={isEditing(personId, "getability") ? fieldError : undefined}
          className="relative z-10 !mx-0 !px-0 !py-0"
          renderDisplay={
            <RecruitStatusBadge
              label={profile.getability?.label}
              tone={getabilityTone(profile.getability?.key)}
            />
          }
          onRequestEdit={() => startEdit(personId, "getability")}
          onCancel={cancelEdit}
          onCommit={(raw, reason) => commit(personId, "getability", raw, reason)}
        />
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-2 rounded-control bg-app-background px-3 py-2.5 text-center">
        <div>
          <p className={typeRole.sectionLabel}>UTR</p>
          <InlineEditCell
            label="UTR"
            type="number"
            step={0.01}
            value={person.utr !== undefined ? String(person.utr) : ""}
            editOn="click"
            align="left"
            className="relative z-10 !mx-0 justify-center !px-0 !py-0"
            editing={isEditing(personId, "utr")}
            error={isEditing(personId, "utr") ? fieldError : undefined}
            renderDisplay={
              <p
                className={`text-sm font-semibold tabular-nums ${
                  utrDisplay !== EMPTY_VALUE ? "text-text-primary" : typeRole.metadataEmpty
                }`}
              >
                {utrDisplay}
              </p>
            }
            onRequestEdit={() => startEdit(personId, "utr")}
            onCancel={cancelEdit}
            onCommit={(raw, reason) => commit(personId, "utr", raw, reason)}
          />
        </div>
        <div>
          <p className={typeRole.sectionLabel}>WTN</p>
          <InlineEditCell
            label="WTN"
            type="number"
            step={0.01}
            value={person.wtn !== undefined ? String(person.wtn) : ""}
            editOn="click"
            align="left"
            className="relative z-10 !mx-0 justify-center !px-0 !py-0"
            editing={isEditing(personId, "wtn")}
            error={isEditing(personId, "wtn") ? fieldError : undefined}
            renderDisplay={
              <p
                className={`text-sm font-semibold tabular-nums ${
                  wtnDisplay !== EMPTY_VALUE ? "text-text-primary" : typeRole.metadataEmpty
                }`}
              >
                {wtnDisplay}
              </p>
            }
            onRequestEdit={() => startEdit(personId, "wtn")}
            onCancel={cancelEdit}
            onCommit={(raw, reason) => commit(personId, "wtn", raw, reason)}
          />
        </div>
      </div>

      <div className="relative z-10 mt-auto pt-1">
        <ContactActionSlots
          tel={phoneDigits ? `tel:${phoneDigits}` : undefined}
          sms={phoneDigits ? `sms:${phoneDigits}` : undefined}
          mailto={email ? `mailto:${email}` : undefined}
        />
      </div>
    </div>
  );
}
