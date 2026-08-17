"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  GraduationCap,
  Mail,
  Medal,
  MessageSquare,
  NotebookPen,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";

import {
  AdaptiveWorkspace,
  type AdaptiveWorkspaceDefinition,
} from "@/components/adaptive-workspace";
import {
  FavoriteToggleButton,
  recordRecentOpen,
} from "@/components/command-palette/favorites";
import { StickyProductivityActionBar } from "@/components/productivity";
import QuickActionButton from "@/components/QuickActionButton";
import { typeRole } from "@/components/typography";
import { useDrawerManager } from "@/components/workspace-drawer";
import { createCommunicationActions } from "@/features/communication";
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
}: {
  person: Person;
  profile: RecruitProfile;
  analytics: RecruitAnalyticsResult | null;
  inCurrentCohort: boolean;
}) {
  const [record, setRecord] = useState(person);
  const [trackedPerson, setTrackedPerson] = useState(person);
  const [profileRecord, setProfileRecord] = useState(profile);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>("personal-info");
  const { status: saveStatus, error: saveError, runSave } = useSaveIndicator();
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();

  if (person.id !== trackedPerson.id) {
    setTrackedPerson(person);
    setRecord(person);
    setProfileRecord(profile);
    setActiveWorkspaceId("personal-info");
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
        title: "Communications / Interactions",
        icon: MessageSquare,
        descriptor: "No interaction history",
      },
    ],
    [analytics?.tier, inCurrentCohort, profileRecord, record.utr],
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
        subtitle: "Ratings & Sources",
        toolbar: WORKSPACE_EDIT_HINT,
        content: (
          <RecruitingRankingsWorkspace coachRank={profileRecord.coachRank} />
        ),
      },
      {
        id: "analytics",
        title: "Analytics",
        subtitle: "Computed recruiting scores",
        content: (
          <RecruitingAnalyticsWorkspace analytics={analytics} inCurrentCohort={inCurrentCohort} />
        ),
      },
      {
        id: "notes",
        title: "Notes",
        subtitle: "Coach notes, game notes, and pitch",
        toolbar: WORKSPACE_EDIT_HINT,
        content: <RecruitingNotesWorkspace />,
      },
      {
        id: "communications",
        title: "Communications / Interactions",
        subtitle: "Calls, texts, and follow-ups",
        content: <RecruitingCommunicationsWorkspace />,
      },
    ],
    [analytics, inCurrentCohort, profileRecord.coachRank],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
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
          coachRank:
            profileRecord.coachRank !== undefined
              ? `#${profileRecord.coachRank}`
              : NO_DATA,
          pipeline: metricOrNoData(formatDisplay(profileRecord.pipelineStage?.label)),
          priority: metricOrNoData(formatDisplay(profileRecord.priority?.label)),
        }}
      />

      <section aria-label="Workspaces">
          {/*
            BP-036D split: narrow workspace rail LEFT, selected content RIGHT.
            Inline columns keep the two-pane layout even if Tailwind arbitrary
            grid tracks fail to generate.
          */}
          <div
            className="grid min-h-[420px] w-full grid-cols-[minmax(260px,320px)_minmax(0,1fr)] grid-rows-1 items-stretch overflow-hidden rounded-card border border-[var(--module-border)] bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
            style={{ gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)" }}
          >
            <aside className="flex min-h-0 min-w-0 flex-col border-r border-[var(--module-border)]">
              <div className="shrink-0 border-b border-[var(--module-border)] px-3.5 py-2">
                <h2 className={typeRole.sectionTitle}>Workspaces</h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <RecruitWorkspaceNav
                  items={workspaceItems}
                  activeId={
                    workspaceItems.some((item) => item.id === activeWorkspaceId)
                      ? activeWorkspaceId
                      : null
                  }
                  onSelect={setActiveWorkspaceId}
                />
              </div>
            </aside>
            <div className="min-h-0 min-w-0">
              <AdaptiveWorkspace
                framed={false}
                activeId={
                  workspaceItems.some((item) => item.id === activeWorkspaceId)
                    ? activeWorkspaceId
                    : null
                }
                workspaces={adaptiveWorkspaces}
              />
            </div>
          </div>
      </section>
      </RecruitWorkspaceFieldSessions>
    </div>
  );
}
