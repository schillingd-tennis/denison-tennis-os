"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  GraduationCap,
  Mail,
  MessageSquare,
  Phone,
  Plane,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import {
  confirmDiscardIfDirty,
  EditableField,
  EditableSection,
  EditorToolbar,
  FormProvider,
  isRequired,
  isValidEmail,
  isValidPhone,
  isValidUtr,
  isValidWtn,
  toOptionalNumber,
  toOptionalString,
  useFormContext,
} from "@/components/editor";

import type { FamilyContact } from "@/features/people/family";
import type { Person } from "@/features/people/types";
import { validatePerson } from "@/features/people/validation";
import {
  formatHeight,
  formatWeight,
  getFullDisplayName,
  getHometown,
  getInitials,
  getPermanentAddress,
  getPlayerStatusLabel,
  getPlayerStatusTone,
  getPreferredContactLabel,
  getStatusLabel,
  getStatusTone,
} from "@/features/people/utils";

import ContactAction from "@/components/ContactAction";
import InformationField from "@/components/InformationField";
import PlayerAvatar from "@/components/PlayerAvatar";
import StatusBadge from "@/components/StatusBadge";
import SummaryStat from "@/components/SummaryStat";
import WorkspaceSection from "@/components/WorkspaceSection";

import FamilyContactCard from "./FamilyContactCard";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const comingLaterModules: { label: string; icon: LucideIcon }[] = [
  { label: "Performance", icon: TrendingUp },
  { label: "Academics", icon: GraduationCap },
  { label: "Travel", icon: Plane },
  { label: "Documents", icon: FileText },
];

const statusOptions = [
  { value: "current", label: "Current" },
  { value: "alumni", label: "Alumni" },
];

const playerStatusOptions = [
  { value: "active", label: "Active" },
  { value: "injured", label: "Injured" },
  { value: "inactive", label: "Inactive" },
  { value: "graduated", label: "Graduated" },
];

const dominantHandOptions = [
  { value: "right", label: "Right" },
  { value: "left", label: "Left" },
];

const preferredContactOptions = [
  { value: "phone", label: "Phone" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
];

/**
 * The Player Workspace, running on the Universal Person Editor (BP-013).
 * Everything below `FormProvider` renders from `draft` — in view mode
 * `draft` always equals the saved `Person`, so the page looks exactly as
 * it did before edit mode existed; entering edit mode simply swaps each
 * field's display for an inline input in place.
 */
export default function PlayerWorkspace({
  person,
  familyContacts,
}: {
  person: Person;
  familyContacts: FamilyContact[];
}) {
  return (
    <FormProvider value={person} validate={validatePerson}>
      <PlayerWorkspaceContent familyContacts={familyContacts} />
    </FormProvider>
  );
}

function PlayerWorkspaceContent({ familyContacts }: { familyContacts: FamilyContact[] }) {
  const router = useRouter();
  const { mode, draft, updateDraft, errors, setFieldError, isDirty, enterEdit, cancelEdit, save } =
    useFormContext<Person>();

  const fullName = getFullDisplayName(draft);
  const hometown = getHometown(draft);
  const address = getPermanentAddress(draft);

  const tel = draft.cellPhone ? `tel:${draft.cellPhone}` : undefined;
  const sms = draft.cellPhone ? `sms:${draft.cellPhone}` : undefined;
  const email = draft.denisonEmail ?? draft.personalEmail;
  const mailto = email ? `mailto:${email}` : undefined;

  const hasContactInfo = Boolean(
    draft.cellPhone || draft.personalEmail || draft.denisonEmail || draft.preferredContactMethod,
  );
  const hasDenisonInfo = Boolean(
    draft.classYear || draft.major || draft.minor || draft.denisonId || draft.dorm || draft.roomNumber,
  );
  const hasTennisInfo = Boolean(
    draft.utr !== undefined ||
      draft.wtn !== undefined ||
      draft.dominantHand ||
      draft.heightInches ||
      draft.weightLbs ||
      draft.playerStatus,
  );

  function handleBackClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!isDirty) return;
    event.preventDefault();
    if (confirmDiscardIfDirty(isDirty)) {
      router.push("/team");
    }
  }

  function handleStatusChange(raw: string) {
    updateDraft({ status: raw as Person["status"] });
    setFieldError("status", isRequired(raw));
  }

  function handlePlayerStatusChange(raw: string) {
    updateDraft({ playerStatus: (raw || undefined) as Person["playerStatus"] });
  }

  function handleFirstNameChange(raw: string) {
    updateDraft({ firstName: raw });
    setFieldError("firstName", isRequired(raw));
  }

  function handleLastNameChange(raw: string) {
    updateDraft({ lastName: raw });
    setFieldError("lastName", isRequired(raw));
  }

  function handlePersonalEmailChange(raw: string) {
    const value = toOptionalString(raw);
    updateDraft({ personalEmail: value });
    setFieldError("personalEmail", isValidEmail(value));
  }

  function handleDenisonEmailChange(raw: string) {
    const value = toOptionalString(raw);
    updateDraft({ denisonEmail: value });
    setFieldError("denisonEmail", isValidEmail(value));
  }

  function handlePhoneChange(raw: string) {
    const value = toOptionalString(raw);
    updateDraft({ cellPhone: value });
    setFieldError("cellPhone", isValidPhone(value));
  }

  function handleUtrChange(raw: string) {
    const value = toOptionalNumber(raw);
    updateDraft({ utr: value });
    setFieldError("utr", isValidUtr(value));
  }

  function handleWtnChange(raw: string) {
    const value = toOptionalNumber(raw);
    updateDraft({ wtn: value });
    setFieldError("wtn", isValidWtn(value));
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/team"
          onClick={handleBackClick}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Team
        </Link>

        <EditorToolbar mode={mode} isDirty={isDirty} onEdit={enterEdit} onCancel={cancelEdit} onSave={save} />
      </div>

      {/* Header */}
      <div className="rounded-card border border-border bg-surface p-8">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-5">
            <PlayerAvatar photoUrl={draft.photoUrl} initials={getInitials(draft)} size={80} />
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-3xl font-semibold tracking-tight text-text-primary">{fullName}</h1>
                {mode === "edit" ? (
                  <select
                    value={draft.status}
                    onChange={(event) => handleStatusChange(event.target.value)}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary focus:border-denison-red focus:outline-none"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <StatusBadge label={getStatusLabel(draft.status)} tone={getStatusTone(draft.status)} />
                )}
                {mode === "edit" ? (
                  <select
                    value={draft.playerStatus ?? ""}
                    onChange={(event) => handlePlayerStatusChange(event.target.value)}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary focus:border-denison-red focus:outline-none"
                  >
                    <option value="">Player Status —</option>
                    {playerStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : draft.playerStatus ? (
                  <StatusBadge
                    label={getPlayerStatusLabel(draft.playerStatus)}
                    tone={getPlayerStatusTone(draft.playerStatus)}
                  />
                ) : null}
              </div>
              <p className="text-sm text-text-secondary">
                {[
                  draft.classYear ? `Class of ${draft.classYear}` : null,
                  draft.major,
                  hometown,
                  draft.utr !== undefined ? `UTR ${draft.utr.toFixed(1)}` : null,
                  draft.wtn !== undefined ? `WTN ${draft.wtn.toFixed(1)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ContactAction href={tel} icon={Phone} label="Call" />
            <ContactAction href={sms} icon={MessageSquare} label="Text" />
            <ContactAction href={mailto} icon={Mail} label="Email" />
          </div>
        </div>
      </div>

      {/* At-a-glance summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryStat label="UTR" value={draft.utr !== undefined ? draft.utr.toFixed(1) : undefined} />
        <SummaryStat label="WTN" value={draft.wtn !== undefined ? draft.wtn.toFixed(1) : undefined} />
        <SummaryStat label="Class Year" value={draft.classYear ? String(draft.classYear) : undefined} />
        <SummaryStat label="Major" value={draft.major} />
        <SummaryStat label="Dorm" value={draft.dorm} />
        <SummaryStat
          label="Player Status"
          value={draft.playerStatus ? getPlayerStatusLabel(draft.playerStatus) : undefined}
        />
      </div>

      {/* Overview */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <EditableSection title="Personal" mode={mode}>
            <EditableField
              label="First Name"
              value={draft.firstName}
              onChange={handleFirstNameChange}
              mode={mode}
              required
              error={errors.firstName}
            />
            <EditableField
              label="Middle Name"
              value={draft.middleName}
              onChange={(raw) => updateDraft({ middleName: toOptionalString(raw) })}
              mode={mode}
            />
            <EditableField
              label="Last Name"
              value={draft.lastName}
              onChange={handleLastNameChange}
              mode={mode}
              required
              error={errors.lastName}
            />
            <EditableField
              label="Preferred Name"
              value={draft.preferredName}
              onChange={(raw) => updateDraft({ preferredName: toOptionalString(raw) })}
              mode={mode}
            />
            <EditableField
              label="Date of Birth"
              value={draft.dateOfBirth}
              onChange={(raw) => updateDraft({ dateOfBirth: toOptionalString(raw) })}
              mode={mode}
              type="date"
            />
          </EditableSection>

          <EditableSection title="Contact Information" mode={mode} isEmpty={!hasContactInfo}>
            <EditableField
              label="Cell Phone"
              value={draft.cellPhone}
              onChange={handlePhoneChange}
              mode={mode}
              type="tel"
              error={errors.cellPhone}
            />
            <EditableField
              label="Personal Email"
              value={draft.personalEmail}
              onChange={handlePersonalEmailChange}
              mode={mode}
              type="email"
              error={errors.personalEmail}
            />
            <EditableField
              label="Denison Email"
              value={draft.denisonEmail}
              onChange={handleDenisonEmailChange}
              mode={mode}
              type="email"
              error={errors.denisonEmail}
            />
            <EditableField
              label="Preferred Contact"
              value={draft.preferredContactMethod}
              onChange={(raw) => updateDraft({ preferredContactMethod: (raw || undefined) as Person["preferredContactMethod"] })}
              mode={mode}
              type="select"
              options={preferredContactOptions}
              formatDisplay={(value) => getPreferredContactLabel(value as Person["preferredContactMethod"])}
            />
          </EditableSection>

          <EditableSection title="Denison Information" mode={mode} isEmpty={!hasDenisonInfo}>
            <EditableField
              label="Class Year"
              value={draft.classYear}
              onChange={(raw) => updateDraft({ classYear: toOptionalNumber(raw) })}
              mode={mode}
              type="number"
            />
            <EditableField
              label="Major"
              value={draft.major}
              onChange={(raw) => updateDraft({ major: toOptionalString(raw) })}
              mode={mode}
            />
            <EditableField
              label="Minor"
              value={draft.minor}
              onChange={(raw) => updateDraft({ minor: toOptionalString(raw) })}
              mode={mode}
            />
            <InformationField label="Denison ID" value={draft.denisonId} />
            <EditableField
              label="Dorm"
              value={draft.dorm}
              onChange={(raw) => updateDraft({ dorm: toOptionalString(raw) })}
              mode={mode}
            />
            <EditableField
              label="Room"
              value={draft.roomNumber}
              onChange={(raw) => updateDraft({ roomNumber: toOptionalString(raw) })}
              mode={mode}
            />
          </EditableSection>

          <EditableSection title="Tennis Information" mode={mode} isEmpty={!hasTennisInfo}>
            <EditableField
              label="UTR"
              value={draft.utr}
              onChange={handleUtrChange}
              mode={mode}
              type="number"
              step={0.1}
              error={errors.utr}
              formatDisplay={(value) => (typeof value === "number" ? value.toFixed(1) : undefined)}
            />
            <EditableField
              label="WTN"
              value={draft.wtn}
              onChange={handleWtnChange}
              mode={mode}
              type="number"
              step={0.1}
              error={errors.wtn}
              formatDisplay={(value) => (typeof value === "number" ? value.toFixed(1) : undefined)}
            />
            <EditableField
              label="Dominant Hand"
              value={draft.dominantHand}
              onChange={(raw) => updateDraft({ dominantHand: (raw || undefined) as Person["dominantHand"] })}
              mode={mode}
              type="select"
              options={dominantHandOptions}
              formatDisplay={(value) => (value ? capitalize(String(value)) : undefined)}
            />
            <EditableField
              label="Height (inches)"
              value={draft.heightInches}
              onChange={(raw) => updateDraft({ heightInches: toOptionalNumber(raw) })}
              mode={mode}
              type="number"
              formatDisplay={(value) => formatHeight(typeof value === "number" ? value : undefined)}
            />
            <EditableField
              label="Weight (lbs)"
              value={draft.weightLbs}
              onChange={(raw) => updateDraft({ weightLbs: toOptionalNumber(raw) })}
              mode={mode}
              type="number"
              formatDisplay={(value) => formatWeight(typeof value === "number" ? value : undefined)}
            />
            <InformationField
              label="Player Status"
              value={draft.playerStatus ? getPlayerStatusLabel(draft.playerStatus) : undefined}
            />
          </EditableSection>

          <EditableSection title="Address" mode={mode}>
            {mode === "view" ? (
              <p className="text-sm text-text-primary sm:col-span-2">
                {address ?? <span className="text-text-secondary">No permanent address on file.</span>}
              </p>
            ) : (
              <>
                <EditableField
                  label="Street"
                  value={draft.addressLine1}
                  onChange={(raw) => updateDraft({ addressLine1: toOptionalString(raw) })}
                  mode={mode}
                  className="sm:col-span-2"
                />
                <EditableField
                  label="City"
                  value={draft.city}
                  onChange={(raw) => updateDraft({ city: toOptionalString(raw) })}
                  mode={mode}
                />
                <EditableField
                  label="State"
                  value={draft.state}
                  onChange={(raw) => updateDraft({ state: toOptionalString(raw) })}
                  mode={mode}
                />
                <EditableField
                  label="Zip"
                  value={draft.zipCode}
                  onChange={(raw) => updateDraft({ zipCode: toOptionalString(raw) })}
                  mode={mode}
                />
                <EditableField
                  label="Country"
                  value={draft.country}
                  onChange={(raw) => updateDraft({ country: toOptionalString(raw) })}
                  mode={mode}
                />
              </>
            )}
          </EditableSection>

          <EditableSection title="Notes" mode={mode} isEmpty={!draft.notes} emptyLabel="No notes on file.">
            <EditableField
              label="Notes"
              value={draft.notes}
              onChange={(raw) => updateDraft({ notes: toOptionalString(raw) })}
              mode={mode}
              type="textarea"
              placeholder="Add notes about this person…"
              className="sm:col-span-2"
            />
          </EditableSection>
        </div>

        <div className="flex flex-col gap-8">
          <WorkspaceSection title="Quick Actions">
            <div className="flex flex-col gap-2">
              <ContactAction href={tel} icon={Phone} label="Call" className="w-full" />
              <ContactAction href={sms} icon={MessageSquare} label="Text" className="w-full" />
              <ContactAction href={mailto} icon={Mail} label="Email" className="w-full" />
            </div>
          </WorkspaceSection>

          <WorkspaceSection title="Family & Contacts">
            {familyContacts.length > 0 ? (
              <div className="flex flex-col gap-4">
                {familyContacts.map((contact) => (
                  <FamilyContactCard key={contact.id} contact={contact} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No family contacts have been added.</p>
            )}
          </WorkspaceSection>
        </div>
      </div>

      {/* Future modules */}
      <WorkspaceSection title="Coming Later">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {comingLaterModules.map((module) => (
            <div
              key={module.label}
              className="flex flex-col items-center gap-2.5 rounded-control border border-dashed border-border px-4 py-6 text-center opacity-60"
            >
              <module.icon className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
              <span className="text-sm font-medium text-text-secondary">{module.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-text-secondary">
          Additional player modules will be added in future sprints.
        </p>
      </WorkspaceSection>
    </div>
  );
}
