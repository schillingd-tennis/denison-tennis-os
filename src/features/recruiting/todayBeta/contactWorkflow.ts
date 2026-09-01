/**
 * Contact Workflow v0.1 — mark text sent, dismiss, snooze (Today Beta).
 */
import { randomUUID } from "node:crypto";

import {
  createRecruitInteraction,
  deleteRecruitInteraction,
} from "@/features/interactions/repository";

import {
  cadenceSnoozeUntil,
  insertContactOpportunityAction,
} from "./contactOpportunityActions";
import { TODAY_BETA_SOURCE_SYSTEM } from "./contactWorkflowConfig";

export class ContactWorkflowError extends Error {}

export async function markContactTextSent(input: {
  recruitPersonId: string;
  messageText: string;
  matchResultId?: string | null;
  upcomingTournamentId?: string | null;
}): Promise<{ interactionId: string }> {
  const trimmed = input.messageText.trim();
  if (!trimmed) {
    throw new ContactWorkflowError("Message text is required.");
  }
  if (!input.recruitPersonId.trim()) {
    throw new ContactWorkflowError("Recruit is required.");
  }

  const occurredAt = new Date().toISOString();
  const sourceKey = `text-sent:${input.recruitPersonId}:${randomUUID()}`;

  let interaction;
  try {
    interaction = await createRecruitInteraction({
      recruitPersonId: input.recruitPersonId,
      interactionType: "text",
      occurredAt,
      tournamentId: null,
      channel: null,
      direction: "outbound",
      participants: null,
      notes: trimmed,
      nextSteps: null,
      loggedBy: null,
      sourceSystem: TODAY_BETA_SOURCE_SYSTEM,
      sourceKey,
    });

    if (input.matchResultId) {
      await insertContactOpportunityAction({
        recruitPersonId: input.recruitPersonId,
        opportunityType: "RESULT",
        action: "HANDLED",
        matchResultId: input.matchResultId,
        interactionId: interaction.id,
      });
    }

    if (input.upcomingTournamentId) {
      await insertContactOpportunityAction({
        recruitPersonId: input.recruitPersonId,
        opportunityType: "TOURNAMENT",
        action: "HANDLED",
        upcomingTournamentId: input.upcomingTournamentId,
        interactionId: interaction.id,
      });
    }
  } catch (error) {
    if (interaction) {
      try {
        await deleteRecruitInteraction(interaction.id);
      } catch {
        // Best-effort rollback; surface original error.
      }
    }
    const message =
      error instanceof Error ? error.message : "Failed to log text interaction.";
    throw new ContactWorkflowError(message);
  }

  return { interactionId: interaction.id };
}

export async function dismissResultOpportunity(input: {
  recruitPersonId: string;
  matchResultId: string;
}): Promise<void> {
  if (!input.matchResultId.trim()) {
    throw new ContactWorkflowError("Match result is required to dismiss.");
  }

  await insertContactOpportunityAction({
    recruitPersonId: input.recruitPersonId,
    opportunityType: "RESULT",
    action: "DISMISSED",
    matchResultId: input.matchResultId,
  });
}

export async function dismissTournamentOpportunity(input: {
  recruitPersonId: string;
  upcomingTournamentId: string;
}): Promise<void> {
  if (!input.upcomingTournamentId.trim()) {
    throw new ContactWorkflowError("Tournament is required to dismiss.");
  }

  await insertContactOpportunityAction({
    recruitPersonId: input.recruitPersonId,
    opportunityType: "TOURNAMENT",
    action: "DISMISSED",
    upcomingTournamentId: input.upcomingTournamentId,
  });
}

export async function snoozeCadenceOpportunity(input: {
  recruitPersonId: string;
  now?: Date;
}): Promise<{ snoozeUntil: string }> {
  const snoozeUntil = cadenceSnoozeUntil(input.now ?? new Date());

  await insertContactOpportunityAction({
    recruitPersonId: input.recruitPersonId,
    opportunityType: "CADENCE",
    action: "SNOOZED",
    snoozeUntil,
  });

  return { snoozeUntil };
}
