"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  School,
  UserRound,
  Users,
} from "lucide-react";

import {
  FavoriteToggleButton,
  recordRecentOpen,
} from "@/components/command-palette/favorites";
import type { SearchObjectType } from "@/components/command-palette/types";
import {
  copyFoundSetSnapshot,
  exportFoundSetSnapshotCsv,
  readFoundSetSnapshot,
} from "@/components/found-set";
import {
  InlineEditCell,
  SaveIndicator,
  useSaveIndicator,
  type InlineCommitReason,
  type InlineSelectOption,
} from "@/components/inline-edit";
import { OverviewPanel, PersonHeader } from "@/components/person";
import { StickyProductivityActionBar } from "@/components/productivity";
import QuickActionButton from "@/components/QuickActionButton";
import type { StatusDotTone } from "@/components/StatusDot";
import { typeRole } from "@/components/typography";
import {
  AdaptiveWorkspace,
  AdaptiveWorkspacePlaceholder,
  type AdaptiveWorkspaceDefinition,
} from "@/components/adaptive-workspace";
import {
  WorkspaceNavigation,
  type WorkspaceNavItem,
} from "@/components/workspace-navigation";

import {
  createCommunicationActions,
  usePersonCommunications,
  type Communication,
} from "@/features/communication";
import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import { useRoles, useStatuses } from "@/features/lookups/useLookups";
import { updatePersonAction } from "@/features/people/actions";
import type { FamilyContact } from "@/features/people/family";
import { TEAM_FOUND_SET_MODULE_KEY } from "@/features/people/foundSet";
import { toPersonWritePatch } from "@/features/people/personWritePatch";
import type { Person, PlayerStatus } from "@/features/people/types";
import {
  getDisplayName,
  getPermanentAddress,
  getPlayerStatusLabel,
  getPreferredContactLabel,
  getStatusLabel,
  hasRole,
  isCoachDirectoryPerson,
} from "@/features/people/utils";
import { formatDate, parseDisplayDate } from "@/lib/formatting";

import PersonStatusLabel from "./PersonStatusLabel";
import TravelWorkspace from "./TravelWorkspace";

function favoriteObjectTypeForPerson(person: Person): SearchObjectType {
  if (hasRole(person, ROLE_KEYS.coach)) return "coaches";
  if (hasRole(person, ROLE_KEYS.staff)) return "staff";
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

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Header-only editable fields (detail editing moves to drawers later). */
type HeaderEditableField = "status" | "role" | "playerStatus";

const HEADER_EDITABLE_FIELDS: HeaderEditableField[] = [
  "status",
  "role",
  "playerStatus",
];

const playerStatusOptions: InlineSelectOption[] = [
  { value: "active", label: "Active" },
  { value: "injured", label: "Injured" },
  { value: "inactive", label: "Inactive" },
  { value: "graduated", label: "Graduated" },
];

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Compact relative day for workspace status lines (Today / Yesterday / date). */
function formatRelativeDay(value: string | undefined): string {
  if (!value) return "No recent contact";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);

  const today = startOfLocalDay(new Date());
  const target = startOfLocalDay(date);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return formatMonthDay(date);
}

function formatMonthDay(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Natural follow-up line for Communication status. */
function followUpStatusLine(communications: Communication[]): string {
  const upcoming = communications
    .map((entry) => entry.followUpDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  if (upcoming.length === 0) return "No follow-up scheduled";

  const date = parseDisplayDate(upcoming[0]);
  if (!date) return `Follow-up ${formatDate(upcoming[0])}`;

  const today = startOfLocalDay(new Date());
  const target = startOfLocalDay(date);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Follow-up today";
  if (diffDays === 1) return "Follow-up tomorrow";
  if (diffDays === -1) return "Follow-up was yesterday";
  return `Follow-up ${formatMonthDay(date)}`;
}

function noteStatusLine(communications: Communication[]): string {
  const noteCount = communications.filter((entry) => entry.type === "note").length;
  if (noteCount === 0) return "No notes yet";
  return noteCount === 1 ? "1 note" : `${noteCount} notes`;
}

/**
 * Person Workspace — executive dashboard + Adaptive Workspace (BP-035C).
 * Header / overview / performance stay fixed; only the workspace surface changes.
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
  const [editing, setEditing] = useState<HeaderEditableField | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [copyFeedback, setCopyFeedback] = useState<string | undefined>(undefined);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const { status: saveStatus, error: saveError, runSave } = useSaveIndicator();
  const roles = useRoles();
  const statuses = useStatuses();

  if (person !== trackedPerson) {
    setTrackedPerson(person);
    setRecord(person);
  }

  const statusOptions: InlineSelectOption[] = statuses.map((status) => ({
    value: status.id,
    label: status.label,
  }));
  const roleOptions: InlineSelectOption[] = roles.map((role) => ({
    value: role.id,
    label: role.label,
  }));

  const displayName = getDisplayName(record);
  const address = getPermanentAddress(record);
  const coachDirectory = isCoachDirectoryPerson(record);
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

  const email = record.denisonEmail ?? record.personalEmail;
  const communications = usePersonCommunications(record.id);
  const communicationActions = createCommunicationActions({
    personId: record.id,
    cellPhone: record.cellPhone,
    email,
  });

  const moveEditing = useCallback(
    (from: HeaderEditableField, direction: "next" | "prev") => {
      const index = HEADER_EDITABLE_FIELDS.indexOf(from);
      if (index < 0) {
        setEditing(null);
        return;
      }
      const nextIndex = direction === "next" ? index + 1 : index - 1;
      if (nextIndex < 0 || nextIndex >= HEADER_EDITABLE_FIELDS.length) {
        setEditing(null);
        return;
      }
      setFieldError(undefined);
      setEditing(HEADER_EDITABLE_FIELDS[nextIndex]);
    },
    [],
  );

  const buildPatch = useCallback(
    (
      field: HeaderEditableField,
      raw: string,
    ): { patch: Partial<Person>; error?: string } => {
      switch (field) {
        case "status": {
          if (!raw) return { patch: {}, error: "Status is required." };
          const status = statuses.find((entry) => entry.id === raw);
          if (!status) return { patch: {}, error: "Status is required." };
          return {
            patch: {
              statusId: status.id,
              status: { id: status.id, key: status.key, label: status.label },
            },
          };
        }
        case "role": {
          if (!raw) return { patch: {}, error: "Role is required." };
          const role = roles.find((entry) => entry.id === raw);
          if (!role) return { patch: {}, error: "Role is required." };
          return {
            patch: {
              roleId: role.id,
              role: { id: role.id, key: role.key, label: role.label },
            },
          };
        }
        case "playerStatus": {
          return {
            patch: { playerStatus: (raw || undefined) as PlayerStatus | undefined },
          };
        }
      }
    },
    [roles, statuses],
  );

  const handleCommit = useCallback(
    async (field: HeaderEditableField, raw: string, reason: InlineCommitReason) => {
      const { patch, error } = buildPatch(field, raw);
      if (error) {
        setFieldError(error);
        return;
      }

      setFieldError(undefined);

      const unchanged =
        (patch.roleId === undefined || patch.roleId === record.roleId) &&
        (patch.statusId === undefined || patch.statusId === record.statusId) &&
        Object.entries(patch)
          .filter(
            ([key]) =>
              key !== "role" && key !== "status" && key !== "roleId" && key !== "statusId",
          )
          .every(([key, value]) => valuesEqual(record[key as keyof Person], value));

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
        const result = await updatePersonAction(record.id, toPersonWritePatch(patch));
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

  function startEdit(field: HeaderEditableField) {
    setFieldError(undefined);
    setEditing(field);
  }

  function cancelEdit() {
    setFieldError(undefined);
    setEditing(null);
  }

  function isEditing(field: HeaderEditableField): boolean {
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

  const workspaceItems = useMemo((): WorkspaceNavItem[] => {
    const latest = communications[0];
    const hasPhone = Boolean(record.cellPhone);
    const hasEmail = Boolean(record.personalEmail || record.denisonEmail);
    const preferred = getPreferredContactLabel(record.preferredContactMethod);
    const parentCount = familyContacts.length;
    const hasEmergency = familyContacts.some((contact) => contact.isEmergencyContact);

    const contactLines = [
      hasPhone ? "Phone available" : "No phone number",
      hasEmail ? "Email available" : "No email address",
    ];
    if (preferred) {
      contactLines.push(`Preferred: ${preferred}`);
    }

    return [
      {
        id: "communication",
        title: "Communication",
        icon: MessageSquare,
        lines: [
          formatRelativeDay(latest?.createdAt),
          followUpStatusLine(communications),
          noteStatusLine(communications),
        ],
      },
      {
        id: "contact",
        title: "Contact Information",
        icon: UserRound,
        lines: contactLines,
      },
      {
        id: "academics",
        title: "Academics",
        icon: GraduationCap,
        lines: ["Standing unavailable", "GPA coming soon"],
      },
      {
        id: "family",
        title: "Family",
        icon: Users,
        lines: [
          parentCount === 0
            ? "No parents connected"
            : parentCount === 1
              ? "1 parent connected"
              : `${parentCount} parents connected`,
          hasEmergency ? "Emergency contact on file" : "No emergency contact",
        ],
      },
      {
        id: "travel",
        title: "Travel",
        icon: Plane,
        lines: ["No upcoming travel", "Travel details coming soon"],
      },
      {
        id: "documents",
        title: "Documents",
        icon: FileText,
        lines: ["No documents yet", "Uploads coming soon"],
      },
      {
        id: "denison",
        title: "Denison Information",
        icon: School,
        lines: [
          record.classYear !== undefined
            ? `Class ${record.classYear}`
            : "Class year not set",
          record.major?.trim() || "Major not set",
        ],
      },
    ];
  }, [
    communications,
    familyContacts,
    record.cellPhone,
    record.classYear,
    record.denisonEmail,
    record.major,
    record.personalEmail,
    record.preferredContactMethod,
  ]);

  const adaptiveWorkspaces = useMemo((): AdaptiveWorkspaceDefinition[] => {
    return [
      {
        id: "communication",
        title: "Communication",
        subtitle: displayName,
        content: (
          <AdaptiveWorkspacePlaceholder
            message="Timeline coming soon."
            action={
              <button
                type="button"
                disabled
                className="inline-flex h-9 items-center justify-center rounded-control bg-denison-red px-3.5 text-sm font-semibold text-surface opacity-40"
              >
                Add Communication
              </button>
            }
          />
        ),
      },
      {
        id: "contact",
        title: "Contact Information",
        subtitle: displayName,
        content: (
          <AdaptiveWorkspacePlaceholder message="Contact details coming soon." />
        ),
      },
      {
        id: "academics",
        title: "Academics",
        subtitle: displayName,
        content: (
          <AdaptiveWorkspacePlaceholder message="Academic dashboard coming soon." />
        ),
      },
      {
        id: "family",
        title: "Family",
        subtitle: displayName,
        content: (
          <AdaptiveWorkspacePlaceholder message="Family contacts coming soon." />
        ),
      },
      {
        id: "travel",
        title: "Travel",
        subtitle: displayName,
        content: (
          <TravelWorkspace
            person={record}
            onPersonChange={setRecord}
            runSave={runSave}
          />
        ),
      },
      {
        id: "documents",
        title: "Documents",
        subtitle: displayName,
        content: (
          <AdaptiveWorkspacePlaceholder message="Documents workspace coming soon." />
        ),
      },
      {
        id: "denison",
        title: "Denison Information",
        subtitle: displayName,
        content: (
          <AdaptiveWorkspacePlaceholder message="Denison information coming soon." />
        ),
      },
    ];
  }, [displayName, record, runSave]);

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
              Back to Team
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
            {communicationActions.call.href ? (
              <QuickActionButton
                href={communicationActions.call.href}
                icon={Phone}
                label={communicationActions.call.label}
                tone="success"
              />
            ) : null}
            {communicationActions.text.href ? (
              <QuickActionButton
                href={communicationActions.text.href}
                icon={MessageSquare}
                label={communicationActions.text.label}
                tone="denison"
              />
            ) : null}
            {communicationActions.email.href ? (
              <QuickActionButton
                href={communicationActions.email.href}
                icon={Mail}
                label={communicationActions.email.label}
                tone="info"
              />
            ) : null}
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

      <PersonHeader
        person={record}
        statusSlot={
          <InlineEditCell
            label="Status"
            value={record.statusId}
            displayValue={getStatusLabel(record)}
            renderDisplay={
              <PersonStatusLabel
                tone={record.status.key === STATUS_KEYS.former ? "alumni" : "active"}
                label={getStatusLabel(record)}
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
        }
        roleSlot={
          <InlineEditCell
            label="Role"
            value={record.roleId}
            displayValue={record.role.label}
            renderDisplay={
              <span className="text-sm font-medium text-text-primary">
                {record.role.label}
              </span>
            }
            type="select"
            options={roleOptions}
            editing={isEditing("role")}
            error={isEditing("role") ? fieldError : undefined}
            onRequestEdit={() => startEdit("role")}
            onCancel={cancelEdit}
            onCommit={(raw, reason) => handleCommit("role", raw, reason)}
          />
        }
        playerStatusSlot={
          !coachDirectory ? (
            <InlineEditCell
              label="Player Status"
              value={record.playerStatus ?? ""}
              displayValue={
                record.playerStatus
                  ? getPlayerStatusLabel(record.playerStatus)
                  : undefined
              }
              renderDisplay={
                record.playerStatus ? (
                  <PersonStatusLabel
                    tone={playerStatusDotTone(record.playerStatus)}
                    label={getPlayerStatusLabel(record.playerStatus)}
                  />
                ) : (
                  <span className="text-sm text-text-secondary/70">
                    Player status —
                  </span>
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
          ) : undefined
        }
      />

      <OverviewPanel person={record} />

      {/*
        BP-036D — Permanent desktop split: Workspace Navigation (left) +
        Active Workspace (right). Always side-by-side; selection updates only
        the right pane. Not stacked, not drawers, not accordions.
      */}
      <section aria-label="Workspaces">
        <div className="grid min-h-[420px] grid-cols-[minmax(260px,320px)_minmax(0,1fr)] items-stretch overflow-hidden rounded-card border border-border/70 bg-surface">
          <aside className="flex min-h-0 flex-col border-r border-border/50">
            <div className="shrink-0 border-b border-border/50 px-3.5 py-2">
              <h2 className={typeRole.sectionTitle}>Workspaces</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <WorkspaceNavigation
                showTitle={false}
                framed={false}
                items={workspaceItems}
                activeId={activeWorkspaceId}
                onSelect={setActiveWorkspaceId}
              />
            </div>
          </aside>
          <AdaptiveWorkspace
            framed={false}
            activeId={activeWorkspaceId}
            workspaces={adaptiveWorkspaces}
          />
        </div>
      </section>
    </div>
  );
}
