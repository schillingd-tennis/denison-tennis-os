"use client";

import type { ReactNode } from "react";

import { InlineEditCell } from "@/components/inline-edit";
import { typeRole } from "@/components/typography";
import { WorkspaceAccentHeading } from "@/components/adaptive-workspace";
import { usePersonFieldSession } from "@/features/field-engine";
import {
  personLookupDisplayLabel,
  personLookupOptions,
} from "@/features/field-engine/personLookupInlineEdit";
import { useRoles, useStatuses } from "@/features/lookups/useLookups";
import type { Person } from "@/features/people/types";
import RecruitStatusBadge from "@/features/recruiting/components/RecruitStatusBadge";
import type { RecruitStatusTone } from "@/features/recruiting/components/statusPresentation";

import {
  personProgramRoleTone,
  personProgramStatusTone,
} from "./personStatusRolePresentation";

function StatusStripItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-max max-w-full shrink-0 flex-col items-start">
      <p className={`${typeRole.workspaceFieldLabel} whitespace-nowrap text-left`}>{label}</p>
      <div className="mt-0.5 text-left">{children}</div>
    </div>
  );
}

function resolveLookupKey(
  field: "statusId" | "roleId",
  person: Person,
  lookups: { id: string; key: string }[],
): string | undefined {
  const id = person[field];
  if (!id) return undefined;
  const joined = field === "statusId" ? person.status : person.role;
  if (joined?.id === id && joined.key) return joined.key;
  return lookups.find((entry) => entry.id === id)?.key;
}

function PersonLookupBadgeField({
  field,
  label,
  tone,
}: {
  field: "statusId" | "roleId";
  label: string;
  tone: (key: string | undefined) => RecruitStatusTone;
}) {
  const session = usePersonFieldSession();
  const roles = useRoles();
  const statuses = useStatuses();
  const lookups = field === "statusId" ? statuses : roles;
  const options = personLookupOptions(field, roles, statuses);
  const value = session.person[field] ?? "";
  const displayLabel = personLookupDisplayLabel(session.person, field, roles, statuses);
  const lookupKey = resolveLookupKey(field, session.person, lookups);

  return (
    <InlineEditCell
      label={label}
      value={value}
      displayValue={displayLabel}
      type="select"
      options={options}
      align="left"
      editOn="click"
      emphasis="workspace"
      density="compact"
      className="!mx-0 !px-0"
      editing={session.isEditing(field)}
      error={session.errorFor(field)}
      onRequestEdit={() => session.startEdit(field)}
      onCancel={session.cancelEdit}
      onCommit={(raw, reason) => session.commit(field, raw, reason)}
      renderDisplay={
        <span title={displayLabel} className="inline-flex max-w-full">
          <RecruitStatusBadge label={displayLabel} tone={tone(lookupKey)} />
        </span>
      }
    />
  );
}

/** Recruit-style status strip for Person program Status + Role (Personal Info). */
export default function PersonStatusRoleStrip() {
  return (
    <section aria-label="Status & Role">
      <WorkspaceAccentHeading>Status & Role</WorkspaceAccentHeading>
      <div
        className="mt-[5px] w-full"
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          flexWrap: "wrap",
          columnGap: 24,
          rowGap: 8,
        }}
      >
        <StatusStripItem label="Status">
          <PersonLookupBadgeField
            field="statusId"
            label="Status"
            tone={personProgramStatusTone}
          />
        </StatusStripItem>
        <StatusStripItem label="Role">
          <PersonLookupBadgeField field="roleId" label="Role" tone={personProgramRoleTone} />
        </StatusStripItem>
      </div>
    </section>
  );
}
