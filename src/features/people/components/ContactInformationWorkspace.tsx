"use client";

import { useMemo, type ReactNode } from "react";

import { typeRole } from "@/components/typography";
import { FieldRenderer, PersonFieldSession } from "@/features/field-engine";
import {
  getPersonFieldsForWorkspace,
  type PersonFieldDefinition,
  type PersonWorkspaceGroupId,
} from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";
import { isFamilyPerson } from "@/features/people/utils";

/**
 * Contact Information Adaptive Workspace body.
 *
 * Field Engine + catalog membership. Role filtering:
 * - Family: Personal Email, Mobile Phone, Preferred Contact, Notes (no Denison Email)
 * - Player / other: Personal Email, Denison Email, Mobile Phone, Preferred Contact
 */

const CONTACT_WORKSPACE_SECTIONS: readonly {
  group: PersonWorkspaceGroupId;
  title: string;
}[] = [
  { group: "contact.email", title: "Email" },
  { group: "contact.phone", title: "Phone" },
  { group: "contact.preferences", title: "Preferences" },
  { group: "contact.notes", title: "Notes" },
];

function isContactFieldVisible(field: PersonFieldDefinition, familyPerson: boolean): boolean {
  if (familyPerson) {
    return field.key !== "denisonEmail";
  }
  // Notes in Contact are Family-Person-only for this milestone.
  return field.key !== "notes";
}

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
  const familyPerson = isFamilyPerson(person);

  const fields = useMemo(() => {
    return getPersonFieldsForWorkspace("contact")
      .filter((field) => isContactFieldVisible(field, familyPerson))
      .map((field) => field.key);
  }, [familyPerson]);

  return (
    <PersonFieldSession
      person={person}
      onPersonChange={onPersonChange}
      runSave={runSave}
      fields={fields}
    >
      <div className="space-y-6">
        {CONTACT_WORKSPACE_SECTIONS.map((section) => {
          const sectionFields = getPersonFieldsForWorkspace("contact", section.group).filter(
            (field) => isContactFieldVisible(field, familyPerson),
          );
          if (sectionFields.length === 0) return null;

          // Notes: section title is enough — avoid a cramped duplicate field label.
          if (section.group === "contact.notes") {
            return (
              <section key={section.group} aria-label={section.title}>
                <h3 className={typeRole.sectionTitle}>{section.title}</h3>
                <div className="mt-3 max-w-xl min-h-[5.5rem]">
                  {sectionFields.map((field) => (
                    <FieldRenderer key={field.key} field={field.key} align="left" />
                  ))}
                </div>
              </section>
            );
          }

          return (
            <FieldSection key={section.group} title={section.title}>
              {sectionFields.map((field) => (
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
