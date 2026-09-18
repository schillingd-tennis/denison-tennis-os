"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

import ModulePageShell from "@/components/ModulePageShell";
import { useDrawerManager } from "@/components/workspace-drawer";
import type { SyncStatus } from "@/features/interactions/appleMessagesSync/ports";
import { formatLastSuccessfulSync } from "@/features/interactions/appleMessagesSync/settingsStatus";
import type { WhatsAppUiStatus } from "@/features/interactions/whatsappSync/settingsStatus";
import { EMPTY_VALUE } from "@/lib/formatting";

import {
  activityByType,
  countAppleMessages,
  countThisWeek,
  countWhatsAppMessages,
  filterCentralInteractions,
  followUpRecruits,
  latestOccurredAt,
  LIST_QUERY_LIMIT,
  uniqueFollowUpCount,
} from "../centralInsights";
import { parseInteractionKind, parseInteractionPeriod, parseInteractionSource } from "../centralPeriod";
import type { RecruitInteraction } from "../types";
import DeleteInteractionConfirm from "./DeleteInteractionConfirm";
import InteractionForm, { type InteractionOption } from "./InteractionForm";
import InteractionList from "./InteractionList";
import InteractionsFilterBar from "./InteractionsFilterBar";
import InteractionsInsightColumn from "./InteractionsInsightColumn";
import InteractionsKpiRow from "./InteractionsKpiRow";
import InteractionsSyncMessagesButton from "./InteractionsSyncMessagesButton";
import InteractionsSyncWhatsAppButton from "./InteractionsSyncWhatsAppButton";
import { useAppleMessagesManualSync } from "./useAppleMessagesManualSync";
import { useWhatsAppManualSync } from "./useWhatsAppManualSync";
import "./interactionsHeaderActions.css";
import styles from "./interactionsPage.module.css";

export default function InteractionsDashboard({
  interactions,
  recruits,
  tournaments,
  appleStatus,
  appleError,
  whatsappStatus,
  whatsappError,
  signedIn,
  hostedSync,
  localWhatsAppSync,
  communicationAlertRecruitIds,
}: {
  interactions: RecruitInteraction[];
  recruits: InteractionOption[];
  tournaments: InteractionOption[];
  appleStatus: SyncStatus;
  appleError: string | null;
  whatsappStatus: WhatsAppUiStatus;
  whatsappError: string | null;
  signedIn: boolean;
  hostedSync: boolean;
  localWhatsAppSync: boolean;
  communicationAlertRecruitIds: readonly string[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const sync = useAppleMessagesManualSync({
    initialStatus: appleStatus,
    initialError: appleError,
    signedIn,
    hosted: hostedSync,
  });
  const whatsapp = useWhatsAppManualSync({
    initialStatus: whatsappStatus,
    initialError: whatsappError,
    signedIn,
    local: localWhatsAppSync,
  });
  const period = parseInteractionPeriod(searchParams.get("period"));
  const kind = parseInteractionKind(searchParams.get("kind"));
  const source = parseInteractionSource(searchParams.get("source"));
  const query = searchParams.get("q") ?? "";
  const now = useMemo(() => new Date(), [searchParams.toString()]);
  const truncated = interactions.length >= LIST_QUERY_LIMIT;

  const dateAndSearch = useMemo(
    () =>
      filterCentralInteractions(interactions, {
        period,
        kind,
        source,
        query,
        now,
        applyKind: false,
        applySource: false,
      }),
    [interactions, period, query, now, kind, source],
  );
  const visible = useMemo(
    () =>
      filterCentralInteractions(interactions, {
        period,
        kind,
        source,
        query,
        now,
        applyKind: true,
        applySource: true,
      }),
    [interactions, period, kind, source, query, now],
  );

  const searched = useMemo(
    () =>
      filterCentralInteractions(interactions, {
        period: "all",
        kind: "all",
        source: "all",
        query,
        now,
        applyKind: false,
        applySource: false,
      }),
    [interactions, query, now],
  );
  const lastOccurredAt = latestOccurredAt(searched);
  const thisWeekCount = countThisWeek(searched, now);
  const alertEligibleIds = useMemo(
    () => new Set(communicationAlertRecruitIds),
    [communicationAlertRecruitIds],
  );
  const followUps = followUpRecruits(interactions, now, 5, alertEligibleIds);
  const followUpCount = uniqueFollowUpCount(interactions, now, alertEligibleIds);
  const textsSynced = countAppleMessages(dateAndSearch) + countWhatsAppMessages(dateAndSearch);
  const activity = activityByType(dateAndSearch);
  const scanCaption = formatLastSuccessfulSync(sync.status.lastCompleted?.finishedAt);
  const filtersActive =
    period !== "past_month" || kind !== "all" || source !== "all" || query.trim().length !== 0;

  function openForm() {
    openDrawer({
      id: "add-recruit-interaction",
      title: "Add Interaction",
      subtitle: "Recruiting · Interactions",
      hideFooter: true,
      content: <InteractionForm recruits={recruits} tournaments={tournaments} onSaved={closeDrawer} onCancel={closeDrawer} />,
    });
  }

  function openInteraction(interaction: RecruitInteraction) {
    openDrawer({
      id: `edit-recruit-interaction-${interaction.id}`,
      title: "Interaction",
      subtitle: "Recruiting · Interactions",
      hideFooter: true,
      content: (
        <InteractionForm
          key={interaction.id}
          interaction={interaction}
          recruits={recruits}
          tournaments={tournaments}
          onSaved={closeDrawer}
          onCancel={closeDrawer}
        />
      ),
    });
  }

  function requestDelete(interaction: RecruitInteraction) {
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
  }

  return (
    <ModulePageShell
      title="Interactions"
      subtitle="Central history of recruiting calls, texts, messages, visits, and follow-ups."
      actions={
        <div className={styles.headerCluster}>
          <div data-interactions-header-actions="">
            <button type="button" onClick={openForm} data-interactions-add-interaction="">
              + Add Interaction
            </button>
            <InteractionsSyncMessagesButton
              disabled={sync.disabled}
              live={sync.live}
              pending={sync.pending}
              notice={sync.notice}
              error={null}
              hosted={hostedSync}
              onQueue={sync.queueSync}
            />
            <InteractionsSyncWhatsAppButton
              disabled={whatsapp.disabled}
              pending={whatsapp.pending}
              notice={whatsapp.notice}
              error={null}
              local={localWhatsAppSync}
              onQueue={whatsapp.queueSync}
            />
          </div>
          {sync.error || whatsapp.error ? (
            <p className="max-w-xs text-right text-[11px] text-danger" role="alert">
              {sync.error ?? whatsapp.error}
            </p>
          ) : null}
        </div>
      }
    >
      <div className={styles.stack} data-interactions-page="">
        <InteractionsKpiRow
          lastOccurredAt={lastOccurredAt}
          thisWeekCount={thisWeekCount}
          followUpCount={followUpCount}
          textsSynced={textsSynced}
          scanCaption={scanCaption === EMPTY_VALUE ? "Latest Messages scan unavailable" : `Scan: ${scanCaption}`}
          truncated={truncated}
        />
        <InteractionsFilterBar period={period} kind={kind} source={source} query={query} />
        <div className={styles.layout} data-interactions-layout="">
          <section className="min-w-0 rounded-card border border-black/[0.06] bg-surface">
            <div className="flex items-baseline justify-between gap-3 border-b border-black/[0.06] px-4 py-3">
              <h2 className="text-sm font-semibold text-text-primary">Recent Interactions</h2>
              <p className="text-xs text-text-secondary tabular-nums">
                {visible.length}
                {truncated ? " · latest 5,000 loaded" : ""}
              </p>
            </div>
            <div className="p-0">
              <InteractionList
                interactions={visible}
                onOpen={openInteraction}
                onDelete={requestDelete}
                density="directory"
                emptyLabel={filtersActive ? "No interactions match these filters." : "No interaction history yet."}
              />
            </div>
          </section>
          <InteractionsInsightColumn
            followUps={followUps}
            activity={activity}
            appleStatus={sync.status}
            appleError={sync.error}
          />
        </div>
      </div>
    </ModulePageShell>
  );
}
