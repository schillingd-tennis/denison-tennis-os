"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Home, IdCard, Mail, NotebookPen, Phone, UserRound } from "lucide-react";

import {
  WorkspaceAccentHeading,
  WorkspaceField,
  WorkspaceFieldGrid,
  type WorkspaceSectionTone,
} from "@/components/adaptive-workspace";
import { InlineEditCell, type InlineCommitReason } from "@/components/inline-edit";
import { typeRole } from "@/components/typography";
import { FieldRenderer, PersonFieldSession, toEditString, usePersonFieldSession } from "@/features/field-engine";
import {
  getPersonField,
  getPersonFieldsForWorkspace,
  type PersonFieldDefinition,
  type PersonWorkspaceGroupId,
} from "@/features/people/fieldCatalog";
import type { Person } from "@/features/people/types";
import { isFamilyPerson } from "@/features/people/utils";
import { upsertRecruitClassYearAction } from "@/features/recruiting/actions";
import { EMPTY_VALUE } from "@/lib/formatting";

import PersonStatusRoleStrip from "./PersonStatusRoleStrip";

/**
 * Personal Info adaptive body (formerly Contact Information).
 * Section chrome matches Recruit Personal Info; field membership from catalog
 * for Family. Player/Coach/Family order: Identity → Status & Role → remaining.
 */

const FAMILY_CONTACT_SECTIONS: readonly {
  group: PersonWorkspaceGroupId;
  title: string;
  layout?: "grid" | "homeAddress" | "notes";
  icon?: LucideIcon;
  tone?: WorkspaceSectionTone;
}[] = [
  { group: "contact.identity", title: "Identity", layout: "grid", icon: UserRound, tone: "module" },
  { group: "contact.homeAddress", title: "Home Address", layout: "homeAddress", icon: Home, tone: "neutral" },
  { group: "contact.email", title: "Email", layout: "grid", icon: Mail, tone: "module" },
  { group: "contact.phone", title: "Phone", layout: "grid", icon: Phone, tone: "neutral" },
  { group: "contact.preferences", title: "Preferences", layout: "grid", icon: IdCard, tone: "neutral" },
  { group: "contact.notes", title: "Notes", layout: "notes", icon: NotebookPen, tone: "knowledge" },
];

const PLAYER_PERSONAL_INFO_FIELDS = [
  "statusId",
  "roleId",
  "firstName",
  "lastName",
  "denisonId",
  "highSchool",
  "dateOfBirth",
  "personalEmail",
  "denisonEmail",
  "cellPhone",
  "addressLine1",
  "city",
  "state",
  "zipCode",
  "country",
  "notes",
] as const;

function isFamilyContactFieldVisible(field: PersonFieldDefinition): boolean {
  return field.key !== "denisonEmail";
}

function PersonalInfoFieldGrid({ children }: { children: ReactNode }) {
  return <WorkspaceFieldGrid columns={3} className="mt-[5px]">{children}</WorkspaceFieldGrid>;
}

function PersonalInfoField({
  field,
  label,
  revealValue = false,
}: {
  field: keyof Person;
  label?: string;
  /** Show the stored value even when the catalog marks the field sensitive (DU #). */
  revealValue?: boolean;
}) {
  const session = usePersonFieldSession();
  const resolvedLabel = label ?? getPersonField(field)?.label ?? String(field);
  const raw = toEditString(session.person[field]);
  const empty = !raw.trim();
  const renderDisplay = revealValue ? (
    <span
      className={`whitespace-pre-wrap ${typeRole.workspaceFieldValue}${
        empty ? ` ${typeRole.metadataEmpty}` : ""
      }`}
    >
      {empty ? EMPTY_VALUE : raw}
    </span>
  ) : undefined;

  return (
    <WorkspaceField label={resolvedLabel}>
      <FieldRenderer
        field={field}
        align="left"
        editOn="click"
        emphasis="workspace"
        density="compact"
        renderDisplay={renderDisplay}
      />
    </WorkspaceField>
  );
}

function ContactInfoSection() {
  return (
    <section aria-label="Contact Info">
      <WorkspaceAccentHeading icon={Mail} tone="module">
        Contact Info
      </WorkspaceAccentHeading>
      <div className="mt-[5px] flex flex-col gap-y-[7px]">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-[7px] sm:grid-cols-3">
          <PersonalInfoField field="personalEmail" />
          <PersonalInfoField field="denisonEmail" />
          <PersonalInfoField field="cellPhone" label="Phone" />
        </dl>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-[7px] sm:grid-cols-2 md:grid-cols-[minmax(0,45fr)_minmax(0,25fr)_minmax(0,15fr)_minmax(0,15fr)]">
          <PersonalInfoField field="addressLine1" label="Address" />
          <PersonalInfoField field="city" label="City" />
          <PersonalInfoField field="state" label="State" />
          <PersonalInfoField field="zipCode" label="Zip" />
        </dl>
        <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-3">
          <PersonalInfoField field="country" label="Country" />
        </dl>
      </div>
    </section>
  );
}

function HomeAddressSection() {
  return (
    <section aria-label="Home Address">
      <WorkspaceAccentHeading icon={Home} tone="neutral">
        Home Address
      </WorkspaceAccentHeading>
      <WorkspaceFieldGrid columns={3} className="mt-[5px]">
        <div className="min-w-0 sm:col-span-full">
          <PersonalInfoField field="addressLine1" label="Address" />
        </div>
        <PersonalInfoField field="city" label="City" />
        <PersonalInfoField field="state" label="State" />
        <PersonalInfoField field="zipCode" label="Zip" />
      </WorkspaceFieldGrid>
    </section>
  );
}

function HsClassField({
  personId,
  value,
  onChange,
  runSave,
}: {
  personId: string;
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const display = value !== undefined ? String(value) : "";

  async function commit(raw: string, reason: InlineCommitReason) {
    const trimmed = raw.trim();
    let next: number | null = null;
    if (trimmed !== "") {
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2200) {
        setError("HS Class must be a valid year.");
        return;
      }
      next = parsed;
    }

    const local = next ?? undefined;
    if (local === value) {
      setError(undefined);
      if (reason !== "tab" && reason !== "shift-tab") setEditing(false);
      else setEditing(false);
      return;
    }

    const previous = value;
    onChange(local);
    setError(undefined);
    setEditing(false);

    const ok = await runSave(async () => {
      const result = await upsertRecruitClassYearAction(personId, next);
      if (!result.success) {
        throw new Error(result.error);
      }
      onChange(result.recruitClassYear ?? undefined);
    });

    if (!ok) {
      onChange(previous);
    }
  }

  return (
    <WorkspaceField label="HS Class">
      <InlineEditCell
        label="HS Class"
        type="number"
        value={display}
        displayValue={display || EMPTY_VALUE}
        align="left"
        editOn="click"
        emphasis="workspace"
        density="compact"
        editing={editing}
        error={error}
        onRequestEdit={() => {
          setError(undefined);
          setEditing(true);
        }}
        onCancel={() => {
          setError(undefined);
          setEditing(false);
        }}
        onCommit={commit}
      />
    </WorkspaceField>
  );
}

function PlayerCoachPersonalInfo({
  person,
  recruitClassYear,
  onPersonChange,
  runSave,
}: {
  person: Person;
  recruitClassYear?: number;
  onPersonChange: (person: Person) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const [hsPersonId, setHsPersonId] = useState(person.id);
  const [hsClassYear, setHsClassYear] = useState(recruitClassYear);
  if (person.id !== hsPersonId) {
    setHsPersonId(person.id);
    setHsClassYear(recruitClassYear);
  }

  return (
    <PersonFieldSession
      person={person}
      onPersonChange={onPersonChange}
      runSave={runSave}
      fields={PLAYER_PERSONAL_INFO_FIELDS}
    >
      <div className="space-y-[14px]">
        <section aria-label="Identity">
          <WorkspaceAccentHeading icon={UserRound} tone="module">
            Identity
          </WorkspaceAccentHeading>
          <PersonalInfoFieldGrid>
            <PersonalInfoField field="firstName" />
            <PersonalInfoField field="lastName" />
            <PersonalInfoField field="denisonId" label="DU #" revealValue />
            <PersonalInfoField field="highSchool" />
            <HsClassField
              personId={person.id}
              value={hsClassYear}
              onChange={setHsClassYear}
              runSave={runSave}
            />
            <PersonalInfoField field="dateOfBirth" />
          </PersonalInfoFieldGrid>
        </section>

        <div className="border-t border-border/50 pt-[14px]">
          <PersonStatusRoleStrip />
        </div>

        <div className="border-t border-border/50 pt-[14px]">
          <ContactInfoSection />
        </div>

        <div className="border-t border-border/50 pt-[14px]">
          <section aria-label="Notes">
            <WorkspaceAccentHeading icon={NotebookPen} tone="knowledge">
              Notes
            </WorkspaceAccentHeading>
            <div className="mt-[5px]">
              <WorkspaceField label="Player Notes">
                <FieldRenderer
                  field="notes"
                  align="left"
                  editOn="click"
                  emphasis="workspace"
                  density="compact"
                  rows={2}
                />
              </WorkspaceField>
            </div>
          </section>
        </div>
      </div>
    </PersonFieldSession>
  );
}

function FamilyPersonalInfo({
  person,
  onPersonChange,
  runSave,
}: {
  person: Person;
  onPersonChange: (person: Person) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const fields = useMemo(() => {
    const contactFields = getPersonFieldsForWorkspace("contact")
      .filter(isFamilyContactFieldVisible)
      .map((field) => field.key);
    return ["statusId", "roleId", ...contactFields] as const;
  }, []);

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
        {FAMILY_CONTACT_SECTIONS.filter((section) => section.group === "contact.identity").map(
          (section) => {
            const sectionFields = getPersonFieldsForWorkspace("contact", section.group).filter(
              isFamilyContactFieldVisible,
            );
            if (sectionFields.length === 0) return null;

            return (
              <section key={section.group} aria-label={section.title}>
                <WorkspaceAccentHeading icon={section.icon} tone={section.tone}>
                  {section.title}
                </WorkspaceAccentHeading>
                {renderSectionBody(sectionFields, section.layout ?? "grid")}
              </section>
            );
          },
        )}

        <div className="border-t border-border/50 pt-[14px]">
          <PersonStatusRoleStrip />
        </div>

        {FAMILY_CONTACT_SECTIONS.filter((section) => section.group !== "contact.identity").map(
          (section) => {
            const sectionFields = getPersonFieldsForWorkspace("contact", section.group).filter(
              isFamilyContactFieldVisible,
            );
            if (section.layout !== "homeAddress" && sectionFields.length === 0) return null;

            const block = (
              <section aria-label={section.title}>
                {section.layout === "homeAddress" ? null : (
                  <WorkspaceAccentHeading icon={section.icon} tone={section.tone}>
                    {section.title}
                  </WorkspaceAccentHeading>
                )}
                {renderSectionBody(sectionFields, section.layout ?? "grid")}
              </section>
            );

            return (
              <div key={section.group} className="border-t border-border/50 pt-[14px]">
                {block}
              </div>
            );
          },
        )}
      </div>
    </PersonFieldSession>
  );
}

export default function ContactInformationWorkspace({
  person,
  recruitClassYear,
  onPersonChange,
  runSave,
}: {
  person: Person;
  recruitClassYear?: number;
  onPersonChange: (person: Person) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  if (isFamilyPerson(person)) {
    return (
      <FamilyPersonalInfo
        person={person}
        onPersonChange={onPersonChange}
        runSave={runSave}
      />
    );
  }

  return (
    <PlayerCoachPersonalInfo
      person={person}
      recruitClassYear={recruitClassYear}
      onPersonChange={onPersonChange}
      runSave={runSave}
    />
  );
}
