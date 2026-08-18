"use client";

import { useMemo, type ReactNode } from "react";

import {
  WorkspaceAccentHeading,
  WorkspaceField,
} from "@/components/adaptive-workspace";
import { FieldRenderer, PersonFieldSession } from "@/features/field-engine";
import {
  getPersonField,
  getPersonFieldsForWorkspace,
  type PersonFieldDefinition,
  type PersonWorkspaceGroupId,
} from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";
import { isFamilyPerson } from "@/features/people/utils";

import PersonStatusRoleStrip from "./PersonStatusRoleStrip";

/**
 * Personal Info adaptive body (formerly Contact Information).
 * Section chrome matches Recruit Personal Info; field membership from catalog.
 */

const CONTACT_WORKSPACE_SECTIONS: readonly {
  group: PersonWorkspaceGroupId;
  title: string;
  layout?: "grid" | "homeAddress" | "notes";
}[] = [
  { group: "contact.identity", title: "Identity", layout: "grid" },
  { group: "contact.homeAddress", title: "Home Address", layout: "homeAddress" },
  { group: "contact.email", title: "Email", layout: "grid" },
  { group: "contact.phone", title: "Phone", layout: "grid" },
  { group: "contact.preferences", title: "Preferences", layout: "grid" },
  { group: "contact.notes", title: "Notes", layout: "notes" },
];

function isContactFieldVisible(field: PersonFieldDefinition, familyPerson: boolean): boolean {
  if (familyPerson) {
    return field.key !== "denisonEmail";
  }
  return field.key !== "notes";
}

function PersonalInfoFieldGrid({ children }: { children: ReactNode }) {
  return (
    <dl
      className="mt-[5px] grid gap-x-6 gap-y-[7px]"
      style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
    >
      {children}
    </dl>
  );
}

function PersonalInfoField({
  field,
  label,
}: {
  field: keyof Person;
  label?: string;
}) {
  const resolvedLabel = label ?? getPersonField(field)?.label ?? String(field);

  return (
    <WorkspaceField label={resolvedLabel}>
      <FieldRenderer
        field={field}
        align="left"
        editOn="click"
        emphasis="workspace"
        density="compact"
      />
    </WorkspaceField>
  );
}

function HomeAddressSection() {
  return (
    <section aria-label="Home Address">
      <WorkspaceAccentHeading>Home Address</WorkspaceAccentHeading>
      <dl
        className="mt-[5px] grid gap-x-6 gap-y-[7px]"
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
      >
        <div className="min-w-0" style={{ gridColumn: "1 / -1" }}>
          <PersonalInfoField field="addressLine1" label="Address" />
        </div>
        <PersonalInfoField field="city" label="City" />
        <PersonalInfoField field="state" label="State" />
        <PersonalInfoField field="zipCode" label="Zip" />
      </dl>
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
    const contactFields = getPersonFieldsForWorkspace("contact")
      .filter((field) => isContactFieldVisible(field, familyPerson))
      .map((field) => field.key);
    return ["statusId", "roleId", ...contactFields] as const;
  }, [familyPerson]);

  function renderSectionBody(
    sectionFields: PersonFieldDefinition[],
    layout: "grid" | "homeAddress" | "notes",
  ) {
    if (layout === "homeAddress") {
      return <HomeAddressSection />;
    }

    if (layout === "notes") {
      return (
        <div className="mt-1.5 min-h-[5.5rem]">
          {sectionFields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field.key}
              align="left"
              editOn="click"
              emphasis="workspace"
              density="compact"
            />
          ))}
        </div>
      );
    }

    return (
      <PersonalInfoFieldGrid>
        {sectionFields.map((field) => (
          <PersonalInfoField key={field.key} field={field.key} label={field.label} />
        ))}
      </PersonalInfoFieldGrid>
    );
  }

  return (
    <PersonFieldSession
      person={person}
      onPersonChange={onPersonChange}
      runSave={runSave}
      fields={fields}
    >
      <div className="space-y-[14px]">
        <PersonStatusRoleStrip />

        {CONTACT_WORKSPACE_SECTIONS.map((section) => {
          const sectionFields = getPersonFieldsForWorkspace("contact", section.group).filter(
            (field) => isContactFieldVisible(field, familyPerson),
          );
          if (section.layout !== "homeAddress" && sectionFields.length === 0) return null;

          const block = (
            <section aria-label={section.title}>
              {section.layout === "homeAddress" ? null : (
                <WorkspaceAccentHeading>{section.title}</WorkspaceAccentHeading>
              )}
              {renderSectionBody(sectionFields, section.layout ?? "grid")}
            </section>
          );

          return (
            <div key={section.group} className="border-t border-border/50 pt-[14px]">
              {block}
            </div>
          );
        })}
      </div>
    </PersonFieldSession>
  );
}
