"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import {
  AdaptiveWorkspace,
  type AdaptiveWorkspaceDefinition,
} from "@/components/adaptive-workspace";
import {
  FavoriteToggleButton,
  recordRecentOpen,
} from "@/components/command-palette/favorites";
import { OverviewPanel, PersonHeader } from "@/components/person";
import { StickyProductivityActionBar } from "@/components/productivity";
import QuickActionButton from "@/components/QuickActionButton";
import { typeRole } from "@/components/typography";
import { useDrawerManager } from "@/components/workspace-drawer";
import {
  WorkspaceNavigation,
  type WorkspaceNavItem,
} from "@/components/workspace-navigation";
import { createCommunicationActions } from "@/features/communication";
import ContactInformationWorkspace from "@/features/people/components/ContactInformationWorkspace";
import DeletePersonConfirm from "@/features/people/components/DeletePersonConfirm";
import PersonStatusLabel from "@/features/people/components/PersonStatusLabel";
import { SaveIndicator, useSaveIndicator } from "@/components/inline-edit";
import type { Person } from "@/features/people/types";
import { getDisplayName, getPersonRoleDisplay, getStatusLabel } from "@/features/people/utils";
import { STATUS_KEYS } from "@/features/lookups/seed";

import type { RecruitAnalyticsResult } from "../analytics/types";
import type { RecruitProfile } from "../types";
import { RecruitingAnalyticsWorkspace, RecruitingProfileWorkspace } from "./RecruitingWorkspaces";

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
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>("recruiting");
  const { status: saveStatus, error: saveError, runSave } = useSaveIndicator();
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();

  if (person.id !== trackedPerson.id) {
    setTrackedPerson(person);
    setRecord(person);
    setProfileRecord(profile);
    setActiveWorkspaceId("recruiting");
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

  const workspaceItems: WorkspaceNavItem[] = useMemo(
    () => [
      {
        id: "recruiting",
        title: "Recruiting",
        icon: Users,
        lines: [
          profileRecord.pipelineStage?.label ?? "No pipeline",
          profileRecord.priority?.label ?? "No priority",
        ],
      },
      {
        id: "analytics",
        title: "Analytics",
        icon: BarChart3,
        lines: inCurrentCohort
          ? [
              analytics?.tier ?? "Outside WTN pool",
              analytics?.compositeRank !== undefined
                ? `Composite Rank ${analytics.compositeRank}`
                : "No composite rank",
            ]
          : ["Historical profile", "Not in current cohort"],
      },
      {
        id: "contact",
        title: "Contact Information",
        icon: UserRound,
        lines: [email ?? "No email", record.cellPhone ?? "No phone"],
      },
    ],
    [analytics, email, inCurrentCohort, profileRecord, record.cellPhone],
  );

  const adaptiveWorkspaces: AdaptiveWorkspaceDefinition[] = useMemo(
    () => [
      {
        id: "recruiting",
        title: "Recruiting",
        subtitle: displayName,
        content: (
          <RecruitingProfileWorkspace
            profile={profileRecord}
            onProfileChange={setProfileRecord}
            runSave={runSave}
          />
        ),
      },
      {
        id: "analytics",
        title: "Analytics",
        subtitle: displayName,
        content: (
          <RecruitingAnalyticsWorkspace analytics={analytics} inCurrentCohort={inCurrentCohort} />
        ),
      },
      {
        id: "contact",
        title: "Contact Information",
        subtitle: displayName,
        content: (
          <ContactInformationWorkspace
            key={record.id}
            person={record}
            onPersonChange={setRecord}
            runSave={runSave}
          />
        ),
      },
    ],
    [analytics, displayName, inCurrentCohort, profileRecord, record, runSave],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
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

      <PersonHeader
        person={record}
        statusSlot={
          <PersonStatusLabel
            tone={record.status.key === STATUS_KEYS.former ? "alumni" : "active"}
            label={getStatusLabel(record)}
          />
        }
        roleSlot={
          <span className="text-sm font-medium text-text-primary">{getPersonRoleDisplay(record)}</span>
        }
      />

      <OverviewPanel person={record} />

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
                activeId={
                  workspaceItems.some((item) => item.id === activeWorkspaceId)
                    ? activeWorkspaceId
                    : null
                }
                onSelect={setActiveWorkspaceId}
              />
            </div>
          </aside>
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
      </section>
    </div>
  );
}
