import { Suspense } from "react";

import InteractionsDashboard from "@/features/interactions/components/InteractionsDashboard";
import { emptySyncStatus } from "@/features/interactions/appleMessagesSync/settingsStatus";
import { getAppleMessagesSyncStatusAction } from "@/features/interactions/appleMessagesSync/actions";
import { listVisibleRecruitingInteractions } from "@/features/interactions/repository";
import { loadRecruitingDirectory } from "@/features/recruiting/directory";
import { listTournaments } from "@/features/tournaments/repository";
import { getDisplayName, getHometown } from "@/features/people/utils";
import { rankedPersonIdsForClass } from "@/features/recruiting/coachRank";
import { COMMUNICATION_ALERT_CLASS_YEAR } from "@/features/interactions/centralInsights";
import { isManualAppleMessagesSyncAvailable } from "@/features/interactions/appleMessagesSync/environment";

export const dynamic = "force-dynamic";

export default async function InteractionsPage() {
  const [interactions, directory, tournamentResult, apple] = await Promise.all([
    listVisibleRecruitingInteractions(),
    loadRecruitingDirectory(),
    listTournaments(),
    getAppleMessagesSyncStatusAction(),
  ]);
  return (
    <Suspense>
      <InteractionsDashboard
        interactions={interactions}
        recruits={directory.rows.map((row) => ({
          id: row.person.id,
          label: getDisplayName(row.person),
          firstName: row.person.firstName,
          lastName: row.person.lastName,
          preferredName: row.person.preferredName,
          classYear: row.profile.recruitClassYear ?? null,
          hometown: getHometown(row.person) ?? null,
        }))}
        tournaments={(tournamentResult.ok ? tournamentResult.tournaments : []).map((item) => ({
          id: item.id,
          label: item.name,
        }))}
        appleStatus={apple.ok ? apple.status : emptySyncStatus()}
        appleError={apple.ok ? null : apple.error}
        signedIn={apple.ok}
        hostedSync={isManualAppleMessagesSyncAvailable()}
        communicationAlertRecruitIds={rankedPersonIdsForClass(directory.rows, COMMUNICATION_ALERT_CLASS_YEAR)}
      />
    </Suspense>
  );
}
