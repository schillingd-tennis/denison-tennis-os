"use client";

import type { ReactNode } from "react";

import { typeRole } from "@/components/typography";
import { FieldRenderer, PersonFieldSession } from "@/features/field-engine";
import {
  getPersonFieldKeysForWorkspace,
  getPersonFieldsForWorkspace,
  type PersonWorkspaceGroupId,
} from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";

/**
 * Contact Information Adaptive Workspace body.
 *
 * Same Field Engine pattern as Travel — catalog membership drives fields;
 * section titles and row layout stay in this view.
 */

const CONTACT_WORKSPACE_SECTIONS: readonly {
  group: PersonWorkspaceGroupId;
  title: string;
}[] = [
  { group: "contact.email", title: "Email" },
  { group: "contact.phone", title: "Phone" },
  { group: "contact.preferences", title: "Preferences" },
];

const CONTACT_FIELDS = getPersonFieldKeysForWorkspace("contact");

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

export default function ContactInformationWorkspace({
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
      fields={CONTACT_FIELDS}
    >
      <div className="space-y-6">
        {CONTACT_WORKSPACE_SECTIONS.map((section) => {
          const fields = getPersonFieldsForWorkspace("contact", section.group);
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
