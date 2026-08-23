"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  GraduationCap,
  Mail,
  Medal,
  MessageSquare,
  NotebookPen,
  Phone,
  SquarePen,
  Trash2,
  UserRound,
} from "lucide-react";

import {
  AdaptiveWorkspace,
  type AdaptiveWorkspaceDefinition,
} from "@/components/adaptive-workspace";
import RunningAthleteIcon from "@/components/icons/RunningAthleteIcon";
import { MobileWorkspaceSelector } from "@/components/mobile-workspace";
import {
  FavoriteToggleButton,
  recordRecentOpen,
} from "@/components/command-palette/favorites";
import {
  PersonWorkspaceDesktopSplit,
  PersonWorkspaceMobilePane,
  PersonWorkspaceShell,
} from "@/components/person-workspace-shell";
import { StickyProductivityActionBar } from "@/components/productivity";
import QuickActionButton from "@/components/QuickActionButton";
import { useDrawerManager } from "@/components/workspace-drawer";
import { createCommunicationActions } from "@/features/communication";
import DeleteInteractionConfirm from "@/features/interactions/components/DeleteInteractionConfirm";
import InteractionForm, { type InteractionOption } from "@/features/interactions/components/InteractionForm";
import type { RecruitInteraction } from "@/features/interactions/types";
import DeletePersonConfirm from "@/features/people/components/DeletePersonConfirm";
import { SaveIndicator, useSaveIndicator } from "@/components/inline-edit";
import type { Person } from "@/features/people/types";
import {
  getDisplayName,
  getStatusLabel,
} from "@/features/people/utils";
import { STATUS_KEYS } from "@/features/lookups/seed";
import {
  EMPTY_VALUE,
  formatDisplay,
  formatUtr,
  formatWtn,
} from "@/lib/formatting";

import type { RecruitAnalyticsResult } from "../analytics/types";
import {
  RECRUIT_NOTES_WORKSPACE_ID,
  type RecruitNoteQuickEntryField,
  type RecruitNoteQuickEntryRequest,
} from "../noteQuickEntry";
import type { RecruitProfile } from "../types";
import {
  RecruitWorkspaceNav,
  RecruitWorkspaceProfile,
  WorkspaceEditHint,
  type RecruitWorkspaceNavItem,
} from "./RecruitWorkspaceChrome";
import {
  RecruitingAcademicsWorkspace,
  RecruitingAnalyticsWorkspace,
  RecruitingCommunicationsWorkspace,
  RecruitingNotesWorkspace,
  RecruitingPersonalInfoWorkspace,
  RecruitingRankingsWorkspace,
  RecruitWorkspaceFieldSessions,
} from "./RecruitingWorkspaces";

const NO_DATA = "No data";
const WORKSPACE_EDIT_HINT = <WorkspaceEditHint />;

function metricOrNoData(value: string): string {
  if (!value.trim() || value === EMPTY_VALUE) return NO_DATA;
  return value;
}

function notesWorkspaceDescriptor(profile: RecruitProfile): string {
  const parts = [
    profile.notes?.trim() ? "Coach notes" : null,
    profile.gameNotes?.trim() ? "Game notes" : null,
    profile.keyPitchAngle?.trim() ? "Pitch angle" : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : "Coach notes · Game notes · Pitch angle";
}

export default function RecruitingPersonWorkspace({
  person,
  profile,
  analytics,
  inCurrentCohort,
  interactions,
  tournamentOptions,
}: {
  person: Person;
  profile: RecruitProfile;
  analytics: RecruitAnalyticsResult | null;
  inCurrentCohort: boolean;
  interactions: RecruitInteraction[];
  tournamentOptions: InteractionOption[];
}) {
  const [record, setRecord] = useState(person);
  const [trackedPerson, setTrackedPerson] = useState(person);
  const [profileRecord, setProfileRecord] = useState(profile);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>("personal-info");
  const [noteQuickEntry, setNoteQuickEntry] = useState<RecruitNoteQuickEntryRequest | null>(
    null,
  );
  const { status: saveStatus, error: saveError, runSave } = useSaveIndicator();
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();

  if (person.id !== trackedPerson.id) {
    setTrackedPerson(person);
    setRecord(person);
    setProfileRecord(profile);
    setActiveWorkspaceId("personal-info");
    setNoteQuickEntry(null);
  } else if (person !== trackedPerson) {
    setTrackedPerson(person);
    setRecord(person);
  }

  const displayName = getDisplayName(record);
  const email = record.personalEmail ?? record.denisonEmail;
  const communicationActions = createCommunicationActions({
    personId: record.id,
    cellPhone: record.cellPhone,
    email,
  });

  const openNoteQuickEntry = useCallback((field: RecruitNoteQuickEntryField) => {
    setActiveWorkspaceId(RECRUIT_NOTES_WORKSPACE_ID);
    setNoteQuickEntry({ field, requestId: Date.now() });
  }, []);

  const clearNoteQuickEntry = useCallback(() => {
    setNoteQuickEntry(null);
  }, []);

  useEffect(() => {
    recordRecentOpen({
      objectId: record.id,
      objectType: "recruits",
      displayName,
      commandId: `person:${record.id}`,
      iconKey: "Users",
      href: `/recruiting/${record.id}`,
    });
  }, [displayName, record.id]);

  function openDeletePersonDrawer() {
    openDrawer({
      id: "delete-person",
      title: `Delete ${displayName}?`,
      content: (
        <DeletePersonConfirm
          personId={record.id}
          personName={displayName}
          onSuccess={() => {
            closeDrawer();
            router.push("/recruiting");
            router.refresh();
          }}
        />
      ),
      cancelAction: {
        label: "Cancel",
        onClick: () => closeDrawer(),
      },
    });
  }

  const recruitOption = { id: record.id, label: displayName };
  const openInteractionDrawer = useCallback(() => {
    openDrawer({
      id: `add-recruit-interaction-${record.id}`,
      title: "Add Interaction",
      subtitle: `Recruiting · ${displayName}`,
      hideFooter: true,
      content: <InteractionForm recruits={[recruitOption]} tournaments={tournamentOptions} defaultRecruitId={record.id} lockRecruit onSaved={closeDrawer} onCancel={closeDrawer} />,
    });
  }, [closeDrawer, displayName, openDrawer, record.id, tournamentOptions]);

  const openExistingInteraction = useCallback((interaction: RecruitInteraction) => {
    openDrawer({
      id: `edit-recruit-interaction-${interaction.id}`,
      title: "Interaction",
      subtitle: `Recruiting · ${displayName}`,
      hideFooter: true,
      content: (
        <InteractionForm
          key={interaction.id}
          interaction={interaction}
          recruits={[{ id: record.id, label: displayName }]}
          tournaments={tournamentOptions}
          defaultRecruitId={record.id}
          lockRecruit
          onSaved={closeDrawer}
          onCancel={closeDrawer}
        />
      ),
    });
  }, [closeDrawer, displayName, openDrawer, record.id, tournamentOptions]);

  const requestDeleteInteraction = useCallback((interaction: RecruitInteraction) => {
    openDrawer({
      id: `delete-interaction-${interaction.id}`,
      title: "Delete Interaction?",
      hideFooter: true,
      content: (
        <DeleteInteractionConfirm
          interactionId={interaction.id}
          onCancel={closeDrawer}
          onSuccess={() => {
            closeDrawer();
            router.refresh();
          }}
        />
      ),
    });
  }, [closeDrawer, openDrawer, router]);

  const workspaceItems: RecruitWorkspaceNavItem[] = useMemo(
    () => [
      {
        id: "personal-info",
        title: "Personal Info",
        icon: UserRound,
        descriptor: [
          profileRecord.recruitClassYear !== undefined
            ? `Class ${profileRecord.recruitClassYear}`
            : "Class year not set",
          profileRecord.recruitType?.label,
        ]
          .filter(Boolean)
          .join(" · "),
      },
      {
        id: "academics",
        title: "Academics",
        icon: GraduationCap,
        descriptor: profileRecord.academicInterests?.trim()
          ? profileRecord.academicInterests
          : "No academic interests",
      },
      {
        id: "rankings",
        title: "Rankings",
        icon: Medal,
        descriptor:
          profileRecord.coachRank !== undefined
            ? `Coach Rank #${profileRecord.coachRank}`
            : record.utr !== undefined
              ? `UTR ${formatUtr(record.utr)}`
              : "Unranked",
      },
      {
        id: "analytics",
        title: "Analytics",
        icon: BarChart3,
        descriptor: inCurrentCohort
          ? (analytics?.tier ?? "No analytics tier")
          : "Historical profile",
      },
      {
        id: "notes",
        title: "Notes",
        icon: NotebookPen,
        descriptor: notesWorkspaceDescriptor(profileRecord),
      },
      {
        id: "communications",
        title: "Interactions",
        icon: MessageSquare,
        descriptor: interactions.length === 0 ? "No interaction history" : `${interactions.length} interaction${interactions.length === 1 ? "" : "s"}`,
      },
    ],
    [analytics?.tier, inCurrentCohort, interactions.length, profileRecord, record.utr],
  );

  const adaptiveWorkspaces: AdaptiveWorkspaceDefinition[] = useMemo(
    () => [
      {
        id: "personal-info",
        title: "Personal Info",
        subtitle: "Identity & Contact",
        content: <RecruitingPersonalInfoWorkspace />,
      },
      {
        id: "academics",
        title: "Academics",
        subtitle: "School & Admissions",
        content: <RecruitingAcademicsWorkspace />,
      },
      {
        id: "rankings",
        title: "Rankings",
        subtitle: "Player rankings & external profiles",
        content: (
          <RecruitingRankingsWorkspace coachRank={profileRecord.coachRank} />
        ),
      },
      {
        id: "analytics",
        title: "Analytics",
        subtitle: "Advanced metrics & performance indicators",
        content: (
          <RecruitingAnalyticsWorkspace analytics={analytics} inCurrentCohort={inCurrentCohort} />
        ),
      },
      {
        id: "notes",
        title: "Notes",
        subtitle: "Coach notes, game notes, and pitch",
        toolbar: WORKSPACE_EDIT_HINT,
        content: (
          <RecruitingNotesWorkspace
            quickEntryRequest={noteQuickEntry}
            onQuickEntryHandled={clearNoteQuickEntry}
          />
        ),
      },
      {
        id: "communications",
        title: "Interactions",
        subtitle: "Calls, texts, and follow-ups",
        toolbar: (
          <button
            type="button"
            onClick={openInteractionDrawer}
            className="h-9 rounded-control bg-[var(--module-accent)] px-3.5 text-sm font-semibold text-white"
          >
            Add Interaction
          </button>
        ),
        content: <RecruitingCommunicationsWorkspace interactions={interactions} onOpen={openExistingInteraction} onDelete={requestDeleteInteraction} />,
      },
    ],
    [analytics, clearNoteQuickEntry, inCurrentCohort, interactions, noteQuickEntry, openExistingInteraction, openInteractionDrawer, profileRecord.coachRank, requestDeleteInteraction],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 max-md:min-w-0 max-md:overflow-x-hidden">
      <StickyProductivityActionBar
        leading={
          <>
            <Link
              href="/recruiting"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to Recruiting
            </Link>
            <SaveIndicator status={saveStatus} error={saveError} />
          </>
        }
        actions={
          <>
            <FavoriteToggleButton
              objectId={record.id}
              objectType="recruits"
              displayName={displayName}
              commandId={`person:${record.id}`}
              href={`/recruiting/${record.id}`}
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
            <QuickActionButton
              onAction={openDeletePersonDrawer}
              icon={Trash2}
              label="Delete Person"
              tone="denison"
            />
          </>
        }
        trailingActions={
          <>
            <QuickActionButton
              onAction={() => openNoteQuickEntry("notes")}
              icon={SquarePen}
              label="Quick edit Coach Notes"
              tone="warning"
              appearance="filled"
            />
            <QuickActionButton
              onAction={() => openNoteQuickEntry("gameNotes")}
              icon={RunningAthleteIcon}
              label="Quick edit Game Notes"
              tone="research"
              appearance="filled"
            />
          </>
        }
      />

      <RecruitWorkspaceFieldSessions
        person={record}
        profile={profileRecord}
        onPersonChange={setRecord}
        onProfileChange={setProfileRecord}
        runSave={runSave}
      >
      <RecruitWorkspaceProfile
        person={record}
        statusLabel={getStatusLabel(record)}
        statusTone={record.status.key === STATUS_KEYS.former ? "alumni" : "active"}
        metrics={{
          utr: metricOrNoData(formatUtr(record.utr)),
          wtn: metricOrNoData(formatWtn(record.wtn)),
          trnRank:
            record.trnRank !== undefined ? String(record.trnRank) : NO_DATA,
          pipeline: metricOrNoData(formatDisplay(profileRecord.pipelineStage?.label)),
          priority: metricOrNoData(formatDisplay(profileRecord.priority?.label)),
        }}
      />

      <PersonWorkspaceShell
        mobile={
          <PersonWorkspaceMobilePane>
            <MobileWorkspaceSelector
              items={workspaceItems.map((item) => ({
                id: item.id,
                title: item.title,
                icon: item.icon,
                lines: item.descriptor ? [item.descriptor] : [],
              }))}
              activeId={
                workspaceItems.some((item) => item.id === activeWorkspaceId)
                  ? activeWorkspaceId
                  : null
              }
              onSelect={setActiveWorkspaceId}
            />
            <AdaptiveWorkspace
              activeId={
                workspaceItems.some((item) => item.id === activeWorkspaceId)
                  ? activeWorkspaceId
                  : null
              }
              workspaces={adaptiveWorkspaces}
            />
          </PersonWorkspaceMobilePane>
        }
        desktop={
          <PersonWorkspaceDesktopSplit
            nav={
              <RecruitWorkspaceNav
                items={workspaceItems}
                activeId={
                  workspaceItems.some((item) => item.id === activeWorkspaceId)
                    ? activeWorkspaceId
                    : null
                }
                onSelect={setActiveWorkspaceId}
              />
            }
            content={
              <AdaptiveWorkspace
                framed={false}
                activeId={
                  workspaceItems.some((item) => item.id === activeWorkspaceId)
                    ? activeWorkspaceId
                    : null
                }
                workspaces={adaptiveWorkspaces}
              />
            }
          />
        }
      />
      </RecruitWorkspaceFieldSessions>
    </div>
  );
}
