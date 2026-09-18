import { Suspense } from "react";

import InteractionsDashboard from "@/features/interactions/components/InteractionsDashboard";
import { emptySyncStatus } from "@/features/interactions/appleMessagesSync/settingsStatus";
import { getAppleMessagesSyncStatusAction } from "@/features/interactions/appleMessagesSync/actions";
import { emptyWhatsAppStatus } from "@/features/interactions/whatsappSync/settingsStatus";
import { getWhatsAppSyncStatusAction } from "@/features/interactions/whatsappSync/actions";
import { listVisibleRecruitingInteractions } from "@/features/interactions/repository";
import { loadRecruitingDirectory } from "@/features/recruiting/directory";
import { listTournaments } from "@/features/tournaments/repository";
import { getDisplayName, getHometown } from "@/features/people/utils";
import { rankedPersonIdsForClass } from "@/features/recruiting/coachRank";
import { COMMUNICATION_ALERT_CLASS_YEAR } from "@/features/interactions/centralInsights";
import { isManualAppleMessagesSyncAvailable } from "@/features/interactions/appleMessagesSync/environment";
import { isManualWhatsAppSyncAvailable } from "@/features/interactions/whatsappSync/environment";

export const dynamic = "force-dynamic";

export default async function InteractionsPage() {
  const [interactions, directory, tournamentResult, apple, whatsapp] = await Promise.all([
    listVisibleRecruitingInteractions(),
    loadRecruitingDirectory(),
    listTournaments(),
    getAppleMessagesSyncStatusAction(),
    getWhatsAppSyncStatusAction(),
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
        whatsappStatus={whatsapp.ok ? whatsapp.status : emptyWhatsAppStatus()}
        whatsappError={whatsapp.ok ? null : whatsapp.error}
        signedIn={apple.ok || whatsapp.ok}
        hostedSync={isManualAppleMessagesSyncAvailable()}
        hostedWhatsAppSync={isManualWhatsAppSyncAvailable()}
        communicationAlertRecruitIds={rankedPersonIdsForClass(directory.rows, COMMUNICATION_ALERT_CLASS_YEAR)}
      />
    </Suspense>
  );
}
