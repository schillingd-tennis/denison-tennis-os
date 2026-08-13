"use client";

import type { ReactNode } from "react";

import { typeRole } from "@/components/typography";
import {
  FieldRenderer,
  PersonFieldSession,
} from "@/features/field-engine";
import {
  getPersonFieldKeysForWorkspace,
  getPersonFieldsForWorkspace,
  type PersonWorkspaceGroupId,
} from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";

/**
 * BP-036F / BP-036G / BP-037 / BP-038B — Travel Adaptive Workspace body.
 *
 * Layout matches Tennis Performance label/value rows — no new design patterns.
 * Field membership comes from the Field Catalog (`workspaces: ["travel"]`).
 * Section titles remain view composition (not field metadata).
 */

const TRAVEL_WORKSPACE_SECTIONS: readonly {
  group: PersonWorkspaceGroupId;
  title: string;
}[] = [
  { group: "travel.identity", title: "Identity" },
  { group: "travel.documents", title: "Travel Documents" },
  { group: "travel.air", title: "Air Travel" },
  { group: "travel.government", title: "Government ID" },
];

const TRAVEL_FIELDS = getPersonFieldKeysForWorkspace("travel");

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5 last:border-b-0">
      <dt className={typeRole.sectionLabel}>{label}</dt>
      <dd className="min-w-0 max-w-[60%] text-right">{children}</dd>
    </div>
  );
}

function FieldSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title}>
      <h3 className={typeRole.sectionTitle}>{title}</h3>
      <dl className="mt-3 max-w-xl">{children}</dl>
    </section>
  );
}

export default function TravelWorkspace({
  person,
  onPersonChange,
  runSave,
}: {
  person: Person;
  onPersonChange: (person: Person) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  return (
    <PersonFieldSession
      person={person}
      onPersonChange={onPersonChange}
      runSave={runSave}
      fields={TRAVEL_FIELDS}
    >
      <div className="space-y-6">
        {TRAVEL_WORKSPACE_SECTIONS.map((section) => {
          const fields = getPersonFieldsForWorkspace("travel", section.group);
          if (fields.length === 0) return null;
          return (
            <FieldSection key={section.group} title={section.title}>
              {fields.map((field) => (
                <FieldRow key={field.key} label={field.label}>
                  <FieldRenderer field={field.key} />
                </FieldRow>
              ))}
            </FieldSection>
          );
        })}
      </div>
    </PersonFieldSession>
  );
}
