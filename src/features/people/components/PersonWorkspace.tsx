"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ClipboardList,
  Copy,
  Download,
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
  FavoriteToggleButton,
  recordRecentOpen,
} from "@/components/command-palette/favorites";
import type { SearchObjectType } from "@/components/command-palette/types";
import {
  isRequired,
  isValidEmail,
  isValidPhone,
  isValidUtr,
  isValidWtn,
  toOptionalNumber,
} from "@/components/editor";
import {
  copyFoundSetSnapshot,
  exportFoundSetSnapshotCsv,
  readFoundSetSnapshot,
} from "@/components/found-set";
import {
  formatPhoneDisplay,
  InlineEditCell,
  normalizeEmail,
  normalizePhone,
  phoneHrefDigits,
  SaveIndicator,
  useSaveIndicator,
  type InlineCommitReason,
  type InlineFieldType,
  type InlineSelectOption,
} from "@/components/inline-edit";
import { StickyProductivityActionBar } from "@/components/productivity";
import EmptyState from "@/components/EmptyState";

import { updatePersonAction } from "@/features/people/actions";
import type { FamilyContact } from "@/features/people/family";
import type { Person, PersonStatus, PlayerStatus } from "@/features/people/types";
import {
  formatDenisonIdDisplay,
  formatHeight,
  formatWeight,
  getDisplayName,
  getFullDisplayName,
  getHometown,
  getInitials,
  getPermanentAddress,
  getPlayerStatusLabel,
  getPreferredContactLabel,
  getStatusLabel,
  hasRole,
  isCoachDirectoryPerson,
} from "@/features/people/utils";
import { TEAM_FOUND_SET_MODULE_KEY } from "@/features/people/foundSet";

import InformationField from "@/components/InformationField";
import PlayerAvatar from "@/components/PlayerAvatar";
import QuickActionButton from "@/components/QuickActionButton";
import type { StatusDotTone } from "@/components/StatusDot";
import SummaryStat from "@/components/SummaryStat";
import { typeClass, typeRole } from "@/components/typography";
import WorkspaceSection from "@/components/WorkspaceSection";

import FamilyContactCard from "./FamilyContactCard";
import PersonRoleBadge from "./PersonRoleBadge";
import PersonStatusLabel from "./PersonStatusLabel";

function favoriteObjectTypeForPerson(person: Person): SearchObjectType {
  if (hasRole(person, "coach")) return "coaches";
  if (hasRole(person, "staff")) return "staff";
  return "people";
}

function playerStatusDotTone(playerStatus: PlayerStatus | undefined): StatusDotTone {
  switch (playerStatus) {
    case "active":
      return "active";
    case "injured":
      return "injured";
    case "inactive":
      return "inactive";
    case "graduated":
      return "alumni";
    default:
      return "muted";
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const comingLaterModules: { label: string; icon: LucideIcon }[] = [
  { label: "Performance", icon: TrendingUp },
  { label: "Academics", icon: GraduationCap },
  { label: "Travel", icon: Plane },
  { label: "Documents", icon: FileText },
];

const statusOptions: InlineSelectOption[] = [
  { value: "current", label: "Current" },
  { value: "alumni", label: "Alumni" },
];

const playerStatusOptions: InlineSelectOption[] = [
  { value: "active", label: "Active" },
  { value: "injured", label: "Injured" },
  { value: "inactive", label: "Inactive" },
  { value: "graduated", label: "Graduated" },
];

const dominantHandOptions: InlineSelectOption[] = [
  { value: "right", label: "Right" },
  { value: "left", label: "Left" },
];

const preferredContactOptions: InlineSelectOption[] = [
  { value: "phone", label: "Phone" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
];

/**
 * Editable fields in Tab order for the Player Workspace (BP-021).
 * Read-only fields (e.g. Denison ID) are intentionally omitted.
 */
type EditableField =
  | "status"
  | "playerStatus"
  | "firstName"
  | "middleName"
  | "lastName"
  | "preferredName"
  | "dateOfBirth"
  | "cellPhone"
  | "personalEmail"
  | "denisonEmail"
  | "preferredContactMethod"
  | "classYear"
  | "major"
  | "minor"
  | "dorm"
  | "roomNumber"
  | "utr"
  | "wtn"
  | "dominantHand"
  | "heightInches"
  | "weightLbs"
  | "addressLine1"
  | "city"
  | "state"
  | "zipCode"
  | "country"
  | "notes";

const EDITABLE_FIELDS: EditableField[] = [
  "status",
  "playerStatus",
  "firstName",
  "middleName",
  "lastName",
  "preferredName",
  "dateOfBirth",
  "cellPhone",
  "personalEmail",
  "denisonEmail",
  "preferredContactMethod",
  "classYear",
  "major",
  "minor",
  "dorm",
  "roomNumber",
  "utr",
  "wtn",
  "dominantHand",
  "heightInches",
  "weightLbs",
  "addressLine1",
  "city",
  "state",
  "zipCode",
  "country",
  "notes",
];

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function WorkspaceField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <dt className={typeRole.sectionLabel}>{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

/**
 * Player Workspace — always-on inline editing via the Universal Inline
 * Editing Framework (BP-021). No page-level Edit mode; double-click any
 * field to edit, with sticky quick actions for contact / ratings links.
 */
export default function PersonWorkspace({
  person,
  familyContacts,
}: {
  person: Person;
  familyContacts: FamilyContact[];
}) {
  const [record, setRecord] = useState(person);
  const [trackedPerson, setTrackedPerson] = useState(person);
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [copyFeedback, setCopyFeedback] = useState<string | undefined>(undefined);
  const { status: saveStatus, error: saveError, runSave } = useSaveIndicator();

  if (person !== trackedPerson) {
    setTrackedPerson(person);
    setRecord(person);
  }

  const fullName = getFullDisplayName(record);
  const displayName = getDisplayName(record);
  const hometown = getHometown(record);
  const address = getPermanentAddress(record);
  const coachDirectory = isCoachDirectoryPerson(record);
  const showDenisonId = !coachDirectory || Boolean(record.denisonId?.trim());
  const favoriteObjectType = favoriteObjectTypeForPerson(record);

  useEffect(() => {
    recordRecentOpen({
      objectId: record.id,
      objectType: favoriteObjectType,
      displayName,
      commandId: `person:${record.id}`,
      iconKey: "Users",
      href: `/team/${record.id}`,
    });
  }, [displayName, favoriteObjectType, record.id]);

  const phoneDigits = phoneHrefDigits(record.cellPhone);
  const phoneDisplay = formatPhoneDisplay(record.cellPhone);
  const tel = phoneDigits ? `tel:${phoneDigits}` : undefined;
  const sms = phoneDigits ? `sms:${phoneDigits}` : undefined;
  const email = record.denisonEmail ?? record.personalEmail;
  const mailto = email ? `mailto:${email}` : undefined;

  // Rating profile URLs are not stored in the Person schema yet (BP-021
  // placeholders) — open buttons stay disabled until those fields exist.

  const moveEditing = useCallback((from: EditableField, direction: "next" | "prev") => {
    const index = EDITABLE_FIELDS.indexOf(from);
    if (index < 0) {
      setEditing(null);
      return;
    }
    const nextIndex = direction === "next" ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= EDITABLE_FIELDS.length) {
      setEditing(null);
      return;
    }
    setFieldError(undefined);
    setEditing(EDITABLE_FIELDS[nextIndex]);
  }, []);

  const buildPatch = useCallback(
    (field: EditableField, raw: string): { patch: Partial<Person>; error?: string } => {
      switch (field) {
        case "status": {
          if (!raw) return { patch: {}, error: "Status is required." };
          return { patch: { status: raw as PersonStatus } };
        }
        case "playerStatus": {
          return { patch: { playerStatus: (raw || undefined) as PlayerStatus | undefined } };
        }
        case "firstName": {
          const error = isRequired(raw);
          return error ? { patch: {}, error } : { patch: { firstName: raw.trim() } };
        }
        case "middleName": {
          const trimmed = raw.trim();
          return { patch: { middleName: trimmed === "" ? undefined : trimmed } };
        }
        case "lastName": {
          const error = isRequired(raw);
          return error ? { patch: {}, error } : { patch: { lastName: raw.trim() } };
        }
        case "preferredName": {
          const trimmed = raw.trim();
          return { patch: { preferredName: trimmed === "" ? undefined : trimmed } };
        }
        case "dateOfBirth": {
          const trimmed = raw.trim();
          return { patch: { dateOfBirth: trimmed === "" ? undefined : trimmed } };
        }
        case "cellPhone": {
          const value = normalizePhone(raw);
          const error = isValidPhone(value);
          return error ? { patch: {}, error } : { patch: { cellPhone: value } };
        }
        case "personalEmail": {
          const value = normalizeEmail(raw);
          const error = isValidEmail(value);
          return error ? { patch: {}, error } : { patch: { personalEmail: value } };
        }
        case "denisonEmail": {
          const value = normalizeEmail(raw);
          const error = isValidEmail(value);
          return error ? { patch: {}, error } : { patch: { denisonEmail: value } };
        }
        case "preferredContactMethod": {
          return {
            patch: {
              preferredContactMethod: (raw || undefined) as Person["preferredContactMethod"],
            },
          };
        }
        case "classYear": {
          if (raw.trim() === "") return { patch: { classYear: undefined } };
          const value = toOptionalNumber(raw);
          if (value === undefined) return { patch: {}, error: "Class year must be a number." };
          return { patch: { classYear: value } };
        }
        case "major": {
          const trimmed = raw.trim();
          return { patch: { major: trimmed === "" ? undefined : trimmed } };
        }
        case "minor": {
          const trimmed = raw.trim();
          return { patch: { minor: trimmed === "" ? undefined : trimmed } };
        }
        case "dorm": {
          const trimmed = raw.trim();
          return { patch: { dorm: trimmed === "" ? undefined : trimmed } };
        }
        case "roomNumber": {
          const trimmed = raw.trim();
          return { patch: { roomNumber: trimmed === "" ? undefined : trimmed } };
        }
        case "utr": {
          if (raw.trim() === "") return { patch: { utr: undefined } };
          const value = toOptionalNumber(raw);
          if (value === undefined) return { patch: {}, error: "UTR must be a number." };
          const error = isValidUtr(value);
          return error ? { patch: {}, error } : { patch: { utr: value } };
        }
        case "wtn": {
          if (raw.trim() === "") return { patch: { wtn: undefined } };
          const value = toOptionalNumber(raw);
          if (value === undefined) return { patch: {}, error: "WTN must be a number." };
          const error = isValidWtn(value);
          return error ? { patch: {}, error } : { patch: { wtn: value } };
        }
        case "dominantHand": {
          return {
            patch: { dominantHand: (raw || undefined) as Person["dominantHand"] },
          };
        }
        case "heightInches": {
          if (raw.trim() === "") return { patch: { heightInches: undefined } };
          const value = toOptionalNumber(raw);
          if (value === undefined) return { patch: {}, error: "Height must be a number." };
          return { patch: { heightInches: value } };
        }
        case "weightLbs": {
          if (raw.trim() === "") return { patch: { weightLbs: undefined } };
          const value = toOptionalNumber(raw);
          if (value === undefined) return { patch: {}, error: "Weight must be a number." };
          return { patch: { weightLbs: value } };
        }
        case "addressLine1": {
          const trimmed = raw.trim();
          return { patch: { addressLine1: trimmed === "" ? undefined : trimmed } };
        }
        case "city": {
          const trimmed = raw.trim();
          return { patch: { city: trimmed === "" ? undefined : trimmed } };
        }
        case "state": {
          const trimmed = raw.trim();
          return { patch: { state: trimmed === "" ? undefined : trimmed } };
        }
        case "zipCode": {
          const trimmed = raw.trim();
          return { patch: { zipCode: trimmed === "" ? undefined : trimmed } };
        }
        case "country": {
          const trimmed = raw.trim();
          return { patch: { country: trimmed === "" ? undefined : trimmed } };
        }
        case "notes": {
          const trimmed = raw.trim();
          return { patch: { notes: trimmed === "" ? undefined : trimmed } };
        }
      }
    },
    [],
  );

  const handleCommit = useCallback(
    async (field: EditableField, raw: string, reason: InlineCommitReason) => {
      const { patch, error } = buildPatch(field, raw);
      if (error) {
        setFieldError(error);
        return;
      }

      setFieldError(undefined);

      const unchanged = Object.entries(patch).every(([key, value]) =>
        valuesEqual(record[key as keyof Person], value),
      );

      if (unchanged) {
        if (reason === "tab") moveEditing(field, "next");
        else if (reason === "shift-tab") moveEditing(field, "prev");
        else setEditing(null);
        return;
      }

      const previous = record;
      setRecord((current) => ({ ...current, ...patch }));

      if (reason === "tab") moveEditing(field, "next");
      else if (reason === "shift-tab") moveEditing(field, "prev");
      else setEditing(null);

      const ok = await runSave(async () => {
        const result = await updatePersonAction(record.id, patch);
        if (!result.success) {
          throw new Error(result.error);
        }
        setRecord(result.person);
      });

      if (!ok) {
        setRecord(previous);
      }
    },
    [buildPatch, moveEditing, record, runSave],
  );

  function startEdit(field: EditableField) {
    setFieldError(undefined);
    setEditing(field);
  }

  function cancelEdit() {
    setFieldError(undefined);
    setEditing(null);
  }

  function isEditing(field: EditableField): boolean {
    return editing === field;
  }

  const handleCopyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopyFeedback("Address copied");
      window.setTimeout(() => setCopyFeedback(undefined), 2000);
    } catch {
      setCopyFeedback("Copy failed");
      window.setTimeout(() => setCopyFeedback(undefined), 2000);
    }
  }, [address]);

  const handleCopyFoundSet = useCallback(async () => {
    const snapshot = readFoundSetSnapshot(TEAM_FOUND_SET_MODULE_KEY);
    if (!snapshot || snapshot.rows.length === 0) {
      setCopyFeedback("No found set");
      window.setTimeout(() => setCopyFeedback(undefined), 2000);
      return;
    }
    try {
      await copyFoundSetSnapshot(snapshot);
      setCopyFeedback("Found set copied");
      window.setTimeout(() => setCopyFeedback(undefined), 2000);
    } catch {
      setCopyFeedback("Copy failed");
      window.setTimeout(() => setCopyFeedback(undefined), 2000);
    }
  }, []);

  const handleExportFoundSet = useCallback(() => {
    const snapshot = readFoundSetSnapshot(TEAM_FOUND_SET_MODULE_KEY);
    if (!snapshot || snapshot.rows.length === 0) {
      setCopyFeedback("No found set");
      window.setTimeout(() => setCopyFeedback(undefined), 2000);
      return;
    }
    exportFoundSetSnapshotCsv(snapshot);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <StickyProductivityActionBar
        leading={
          <>
            <Link
              href="/team"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Team
            </Link>
            <SaveIndicator status={saveStatus} error={saveError} />
            {copyFeedback ? (
              <span className="text-xs font-medium text-success" role="status">
                {copyFeedback}
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            <FavoriteToggleButton
              objectId={record.id}
              objectType={favoriteObjectType}
              displayName={displayName}
              commandId={`person:${record.id}`}
              href={`/team/${record.id}`}
              iconKey="Users"
            />
            {tel ? <QuickActionButton href={tel} icon={Phone} label="Call" tone="success" /> : null}
            {sms ? <QuickActionButton href={sms} icon={MessageSquare} label="Text" tone="denison" /> : null}
            {mailto ? <QuickActionButton href={mailto} icon={Mail} label="Email" tone="info" /> : null}
            {address ? (
              <QuickActionButton
                onAction={handleCopyAddress}
                icon={Copy}
                label="Copy Address"
                tone="neutral"
              />
            ) : null}
            <QuickActionButton
              onAction={handleCopyFoundSet}
              icon={ClipboardList}
              label="Copy Found Set"
              tone="neutral"
            />
            <QuickActionButton
              onAction={handleExportFoundSet}
              icon={Download}
              label="Export Found Set"
              tone="neutral"
            />
          </>
        }
      />

      {/* Header */}
      <div className="rounded-card border border-border bg-surface px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <PlayerAvatar photoUrl={record.photoUrl} initials={getInitials(record)} size={64} />
            <div className="flex min-w-0 flex-col gap-2.5">
              <div className="flex min-w-0 flex-col gap-1.5">
                <h1 className={typeRole.personNameHero}>{fullName}</h1>
                <PersonRoleBadge person={record} />
                {showDenisonId ? (
                  <p className={typeClass("metadata", "tabular-nums")}>
                    {formatDenisonIdDisplay(record.denisonId)}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <InlineEditCell
                  label="Status"
                  value={record.status}
                  displayValue={getStatusLabel(record.status)}
                  renderDisplay={
                    <PersonStatusLabel
                      tone={record.status === "alumni" ? "alumni" : "active"}
                      label={getStatusLabel(record.status)}
                    />
                  }
                  type="select"
                  options={statusOptions}
                  editing={isEditing("status")}
                  error={isEditing("status") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("status")}
                  onCancel={cancelEdit}
                  onCommit={(raw, reason) => handleCommit("status", raw, reason)}
                />
                {!coachDirectory ? (
                  <InlineEditCell
                    label="Player Status"
                    value={record.playerStatus ?? ""}
                    displayValue={
                      record.playerStatus ? getPlayerStatusLabel(record.playerStatus) : undefined
                    }
                    renderDisplay={
                      record.playerStatus ? (
                        <PersonStatusLabel
                          tone={playerStatusDotTone(record.playerStatus)}
                          label={getPlayerStatusLabel(record.playerStatus)}
                        />
                      ) : (
                        <span className="text-sm text-text-secondary/70">Player status —</span>
                      )
                    }
                    type="select"
                    options={playerStatusOptions}
                    editing={isEditing("playerStatus")}
                    error={isEditing("playerStatus") ? fieldError : undefined}
                    onRequestEdit={() => startEdit("playerStatus")}
                    onCancel={cancelEdit}
                    onCommit={(raw, reason) => handleCommit("playerStatus", raw, reason)}
                  />
                ) : null}
              </div>
              <p className={`${typeRole.metadata} leading-relaxed`}>
                {(coachDirectory
                  ? [hometown, phoneDisplay, email]
                  : [
                      record.classYear ? `Class of ${record.classYear}` : null,
                      record.major,
                      hometown,
                      record.utr !== undefined ? `UTR ${record.utr.toFixed(1)}` : null,
                      record.wtn !== undefined ? `WTN ${record.wtn.toFixed(1)}` : null,
                    ]
                )
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* At-a-glance summary — coach vs player layout */}
      {coachDirectory ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          <SummaryStat label="Title" value={record.title} />
          <SummaryStat label="Hometown" value={hometown} />
          <SummaryStat label="Phone" value={phoneDisplay} />
          <SummaryStat label="Email" value={email} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryStat
            label="UTR"
            value={record.utr !== undefined ? record.utr.toFixed(1) : undefined}
          />
          <SummaryStat
            label="WTN"
            value={record.wtn !== undefined ? record.wtn.toFixed(1) : undefined}
          />
          <SummaryStat
            label="Class Year"
            value={record.classYear ? String(record.classYear) : undefined}
          />
          <SummaryStat label="Major" value={record.major} />
          <SummaryStat label="Dorm" value={record.dorm} />
          <SummaryStat
            label="Player Status"
            value={record.playerStatus ? getPlayerStatusLabel(record.playerStatus) : undefined}
          />
        </div>
      )}

      {/* Overview */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <WorkspaceSection title="Personal">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
              <WorkspaceField label="First Name">
                <PersonInlineField
                  label="First Name"
                  field="firstName"
                  value={record.firstName}
                  editing={isEditing("firstName")}
                  error={isEditing("firstName") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("firstName")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Middle Name">
                <PersonInlineField
                  label="Middle Name"
                  field="middleName"
                  value={record.middleName ?? ""}
                  displayValue={record.middleName}
                  editing={isEditing("middleName")}
                  error={isEditing("middleName") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("middleName")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Last Name">
                <PersonInlineField
                  label="Last Name"
                  field="lastName"
                  value={record.lastName}
                  editing={isEditing("lastName")}
                  error={isEditing("lastName") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("lastName")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Preferred Name">
                <PersonInlineField
                  label="Preferred Name"
                  field="preferredName"
                  value={record.preferredName ?? ""}
                  displayValue={record.preferredName}
                  editing={isEditing("preferredName")}
                  error={isEditing("preferredName") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("preferredName")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Date of Birth">
                <PersonInlineField
                  label="Date of Birth"
                  field="dateOfBirth"
                  value={record.dateOfBirth ?? ""}
                  displayValue={record.dateOfBirth}
                  type="date"
                  editing={isEditing("dateOfBirth")}
                  error={isEditing("dateOfBirth") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("dateOfBirth")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
            </dl>
          </WorkspaceSection>

          <WorkspaceSection title="Contact Information">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
              <WorkspaceField label="Cell Phone">
                <PersonInlineField
                  label="Cell Phone"
                  field="cellPhone"
                  value={record.cellPhone ?? ""}
                  displayValue={phoneDisplay}
                  type="tel"
                  editing={isEditing("cellPhone")}
                  error={isEditing("cellPhone") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("cellPhone")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                  renderDisplay={
                    phoneDisplay && tel ? (
                      <a
                        href={tel}
                        className="text-sm text-text-primary transition-colors hover:text-denison-red"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {phoneDisplay}
                      </a>
                    ) : undefined
                  }
                />
              </WorkspaceField>
              <WorkspaceField label="Personal Email">
                <PersonInlineField
                  label="Personal Email"
                  field="personalEmail"
                  value={record.personalEmail ?? ""}
                  displayValue={record.personalEmail}
                  type="email"
                  editing={isEditing("personalEmail")}
                  error={isEditing("personalEmail") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("personalEmail")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                  renderDisplay={
                    record.personalEmail ? (
                      <a
                        href={`mailto:${record.personalEmail}`}
                        className="text-sm text-text-primary transition-colors hover:text-denison-red"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {record.personalEmail}
                      </a>
                    ) : undefined
                  }
                />
              </WorkspaceField>
              <WorkspaceField label="Denison Email">
                <PersonInlineField
                  label="Denison Email"
                  field="denisonEmail"
                  value={record.denisonEmail ?? ""}
                  displayValue={record.denisonEmail}
                  type="email"
                  editing={isEditing("denisonEmail")}
                  error={isEditing("denisonEmail") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("denisonEmail")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                  renderDisplay={
                    record.denisonEmail ? (
                      <a
                        href={`mailto:${record.denisonEmail}`}
                        className="text-sm text-text-primary transition-colors hover:text-denison-red"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {record.denisonEmail}
                      </a>
                    ) : undefined
                  }
                />
              </WorkspaceField>
              <WorkspaceField label="Preferred Contact">
                <PersonInlineField
                  label="Preferred Contact"
                  field="preferredContactMethod"
                  value={record.preferredContactMethod ?? ""}
                  displayValue={getPreferredContactLabel(record.preferredContactMethod)}
                  type="select"
                  options={preferredContactOptions}
                  editing={isEditing("preferredContactMethod")}
                  error={isEditing("preferredContactMethod") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("preferredContactMethod")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
            </dl>
          </WorkspaceSection>

          <WorkspaceSection title="Denison Information">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
              <WorkspaceField label="Class Year">
                <PersonInlineField
                  label="Class Year"
                  field="classYear"
                  value={record.classYear !== undefined ? String(record.classYear) : ""}
                  displayValue={record.classYear !== undefined ? String(record.classYear) : undefined}
                  type="number"
                  editing={isEditing("classYear")}
                  error={isEditing("classYear") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("classYear")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Major">
                <PersonInlineField
                  label="Major"
                  field="major"
                  value={record.major ?? ""}
                  displayValue={record.major}
                  editing={isEditing("major")}
                  error={isEditing("major") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("major")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Minor">
                <PersonInlineField
                  label="Minor"
                  field="minor"
                  value={record.minor ?? ""}
                  displayValue={record.minor}
                  editing={isEditing("minor")}
                  error={isEditing("minor") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("minor")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <InformationField
                label="Denison ID"
                value={record.denisonId ? formatDenisonIdDisplay(record.denisonId) : undefined}
              />
              <WorkspaceField label="Dorm">
                <PersonInlineField
                  label="Dorm"
                  field="dorm"
                  value={record.dorm ?? ""}
                  displayValue={record.dorm}
                  editing={isEditing("dorm")}
                  error={isEditing("dorm") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("dorm")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Room">
                <PersonInlineField
                  label="Room"
                  field="roomNumber"
                  value={record.roomNumber ?? ""}
                  displayValue={record.roomNumber}
                  editing={isEditing("roomNumber")}
                  error={isEditing("roomNumber") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("roomNumber")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
            </dl>
          </WorkspaceSection>

          <WorkspaceSection title="Tennis Information">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
              <WorkspaceField label="UTR">
                <PersonInlineField
                  label="UTR"
                  field="utr"
                  value={record.utr !== undefined ? String(record.utr) : ""}
                  displayValue={record.utr !== undefined ? record.utr.toFixed(1) : undefined}
                  type="number"
                  step={0.1}
                  editing={isEditing("utr")}
                  error={isEditing("utr") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("utr")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="WTN">
                <PersonInlineField
                  label="WTN"
                  field="wtn"
                  value={record.wtn !== undefined ? String(record.wtn) : ""}
                  displayValue={record.wtn !== undefined ? record.wtn.toFixed(1) : undefined}
                  type="number"
                  step={0.1}
                  editing={isEditing("wtn")}
                  error={isEditing("wtn") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("wtn")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Dominant Hand">
                <PersonInlineField
                  label="Dominant Hand"
                  field="dominantHand"
                  value={record.dominantHand ?? ""}
                  displayValue={record.dominantHand ? capitalize(record.dominantHand) : undefined}
                  type="select"
                  options={dominantHandOptions}
                  editing={isEditing("dominantHand")}
                  error={isEditing("dominantHand") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("dominantHand")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Height">
                <PersonInlineField
                  label="Height"
                  field="heightInches"
                  value={record.heightInches !== undefined ? String(record.heightInches) : ""}
                  displayValue={formatHeight(record.heightInches)}
                  type="number"
                  editing={isEditing("heightInches")}
                  error={isEditing("heightInches") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("heightInches")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Weight">
                <PersonInlineField
                  label="Weight"
                  field="weightLbs"
                  value={record.weightLbs !== undefined ? String(record.weightLbs) : ""}
                  displayValue={formatWeight(record.weightLbs)}
                  type="number"
                  editing={isEditing("weightLbs")}
                  error={isEditing("weightLbs") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("weightLbs")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
            </dl>
          </WorkspaceSection>

          <WorkspaceSection title="Address">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
              <WorkspaceField label="Street" className="sm:col-span-2">
                <PersonInlineField
                  label="Street"
                  field="addressLine1"
                  value={record.addressLine1 ?? ""}
                  displayValue={record.addressLine1}
                  editing={isEditing("addressLine1")}
                  error={isEditing("addressLine1") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("addressLine1")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="City">
                <PersonInlineField
                  label="City"
                  field="city"
                  value={record.city ?? ""}
                  displayValue={record.city}
                  editing={isEditing("city")}
                  error={isEditing("city") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("city")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="State">
                <PersonInlineField
                  label="State"
                  field="state"
                  value={record.state ?? ""}
                  displayValue={record.state}
                  editing={isEditing("state")}
                  error={isEditing("state") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("state")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Zip">
                <PersonInlineField
                  label="Zip"
                  field="zipCode"
                  value={record.zipCode ?? ""}
                  displayValue={record.zipCode}
                  editing={isEditing("zipCode")}
                  error={isEditing("zipCode") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("zipCode")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
              <WorkspaceField label="Country">
                <PersonInlineField
                  label="Country"
                  field="country"
                  value={record.country ?? ""}
                  displayValue={record.country}
                  editing={isEditing("country")}
                  error={isEditing("country") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("country")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
            </dl>
          </WorkspaceSection>

          <WorkspaceSection title="Notes">
            <dl>
              <WorkspaceField label="Notes" className="sm:col-span-2">
                <PersonInlineField
                  label="Notes"
                  field="notes"
                  value={record.notes ?? ""}
                  displayValue={record.notes}
                  type="textarea"
                  editing={isEditing("notes")}
                  error={isEditing("notes") ? fieldError : undefined}
                  onRequestEdit={() => startEdit("notes")}
                  onCancel={cancelEdit}
                  onCommit={handleCommit}
                />
              </WorkspaceField>
            </dl>
          </WorkspaceSection>
        </div>

        <div className="flex flex-col gap-5">
          <WorkspaceSection title="Family & Contacts">
            {familyContacts.length > 0 ? (
              <div className="flex flex-col gap-3">
                {familyContacts.map((contact) => (
                  <FamilyContactCard key={contact.id} contact={contact} />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                title="No family contacts"
                description="Related people will appear here when linked."
              />
            )}
          </WorkspaceSection>

          <WorkspaceSection title="More to come">
            <ul className="flex flex-col gap-1.5">
              {comingLaterModules.map((module) => (
                <li
                  key={module.label}
                  className="flex items-center gap-2.5 rounded-control px-1 py-1.5 text-sm text-text-secondary/70"
                >
                  <module.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span>{module.label}</span>
                </li>
              ))}
            </ul>
          </WorkspaceSection>
        </div>
      </div>
    </div>
  );
}

function PersonInlineField({
  label,
  field,
  value,
  displayValue,
  type,
  options,
  step,
  editing,
  error,
  renderDisplay,
  onRequestEdit,
  onCancel,
  onCommit,
}: {
  label: string;
  field: EditableField;
  value: string;
  displayValue?: string;
  type?: InlineFieldType;
  options?: InlineSelectOption[];
  step?: number;
  editing: boolean;
  error?: string;
  renderDisplay?: ReactNode;
  onRequestEdit: () => void;
  onCancel: () => void;
  onCommit: (field: EditableField, raw: string, reason: InlineCommitReason) => void | Promise<void>;
}) {
  return (
    <InlineEditCell
      label={label}
      value={value}
      displayValue={displayValue}
      renderDisplay={renderDisplay}
      type={type}
      options={options}
      step={step}
      editing={editing}
      error={error}
      onRequestEdit={onRequestEdit}
      onCancel={onCancel}
      onCommit={(raw, reason) => onCommit(field, raw, reason)}
    />
  );
}
