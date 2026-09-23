"use server";

import { revalidatePath } from "next/cache";

import { TEAM_OPERATIONS_SCOUTING_ROUTE } from "@/lib/module-routes";
import { parseSubmissionStatus, readDirectReportFormData, readPublicScoutingFormData } from "./formData";
import { scoutingFormPublicPath } from "./formPaths";
import {
  archiveOpponentPlayer,
  backfillUnpromotedSubmissions,
  createFormLink,
  getPlayerWorkspace,
  getTeamWorkspace,
  mapScoutingTeamAlias,
  markPlayerAiReviewed,
  promoteFormSubmission,
  regeneratePlayerAiReport,
  regenerateTeamAiReport,
  restoreOpponentPlayer,
  reviewAndPublishFormSubmission,
  revokeFormLink,
  runScoutingDuplicateAuditCounts,
  saveDirectReport,
  saveManualPlayerReport,
  saveManualTeamReport,
  submitPublicForm,
  updateSubmissionStatus,
} from "./repository";
import { requireScoutingWriteUser } from "./scoutingAuth";

function revalidateScouting() {
  revalidatePath(TEAM_OPERATIONS_SCOUTING_ROUTE);
  revalidatePath("/team-operations");
}

export async function loadPlayerWorkspaceAction(opponentPlayerId: string) {
  try {
    const workspace = await getPlayerWorkspace(opponentPlayerId);
    return { success: true as const, workspace };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Could not load player workspace.",
    };
  }
}

export async function loadTeamWorkspaceAction(teamId: string) {
  try {
    const workspace = await getTeamWorkspace(teamId);
    return { success: true as const, workspace };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Could not load team workspace.",
    };
  }
}

export async function archiveOpponentPlayerAction(opponentPlayerId: string) {
  const auth = await requireScoutingWriteUser();
  if (!auth.ok) return { success: false as const, message: auth.error };
  if (!opponentPlayerId.trim()) {
    return { success: false as const, message: "Opponent player is required." };
  }
  try {
    const result = await archiveOpponentPlayer(opponentPlayerId, auth.userId);
    revalidateScouting();
    return {
      success: true as const,
      player: result.player,
      deactivatedFormLinkCount: result.deactivatedFormLinkCount,
      alreadyArchived: result.alreadyArchived,
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Could not archive opponent.",
    };
  }
}

export async function restoreOpponentPlayerAction(opponentPlayerId: string) {
  const auth = await requireScoutingWriteUser();
  if (!auth.ok) return { success: false as const, message: auth.error };
  if (!opponentPlayerId.trim()) {
    return { success: false as const, message: "Opponent player is required." };
  }
  try {
    const result = await restoreOpponentPlayer(opponentPlayerId);
    revalidateScouting();
    return {
      success: true as const,
      player: result.player,
      alreadyActive: result.alreadyActive,
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Could not restore opponent.",
    };
  }
}

export async function saveDirectReportAction(formData: FormData) {
  const parsed = readDirectReportFormData(formData);
  if (!parsed.ok) return { success: false, message: parsed.message } as const;
  try {
    const report = await saveDirectReport(parsed.id, parsed.payload);
    revalidateScouting();
    return { success: true, report } as const;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not save report.",
    } as const;
  }
}

export async function saveManualPlayerReportAction(opponentPlayerId: string, body: string) {
  if (!opponentPlayerId.trim()) return { success: false, message: "Player is required." } as const;
  try {
    const report = await saveManualPlayerReport(opponentPlayerId, body);
    revalidateScouting();
    return { success: true, report } as const;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not save player report.",
    } as const;
  }
}

export async function regeneratePlayerAiAction(opponentPlayerId: string) {
  try {
    const result = await regeneratePlayerAiReport(opponentPlayerId);
    if ("error" in result) return { success: false, message: result.error } as const;
    revalidateScouting();
    return { success: true, report: result } as const;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not generate AI summary.",
    } as const;
  }
}

export async function reviewPlayerAiAction(reportId: string) {
  try {
    const report = await markPlayerAiReviewed(reportId);
    revalidateScouting();
    return { success: true, report } as const;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not mark reviewed.",
    } as const;
  }
}

export async function saveManualTeamReportAction(teamId: string, body: string) {
  try {
    const report = await saveManualTeamReport(teamId, body);
    revalidateScouting();
    return { success: true, report } as const;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not save team report.",
    } as const;
  }
}

export async function regenerateTeamAiAction(teamId: string) {
  try {
    const result = await regenerateTeamAiReport(teamId);
    if ("error" in result) return { success: false, message: result.error } as const;
    revalidateScouting();
    return { success: true, report: result } as const;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not generate team AI summary.",
    } as const;
  }
}

export async function createFormLinkAction(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim() || "Post-match scouting form";
  const teamId = String(formData.get("teamId") ?? "").trim() || null;
  const opponentPlayerId = String(formData.get("opponentPlayerId") ?? "").trim() || null;
  const expiresAt = String(formData.get("expiresAt") ?? "").trim() || null;
  try {
    const link = await createFormLink({ label, teamId, opponentPlayerId, expiresAt });
    revalidateScouting();
    return {
      success: true,
      link,
      urlPath: link.rawToken ? scoutingFormPublicPath(link.rawToken) : null,
    } as const;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create form link.",
    } as const;
  }
}

export async function revokeFormLinkAction(id: string) {
  try {
    await revokeFormLink(id);
    revalidateScouting();
    return { success: true } as const;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not revoke link.",
    } as const;
  }
}

export async function updateSubmissionStatusAction(id: string, formData: FormData) {
  const auth = await requireScoutingWriteUser();
  if (!auth.ok) return { success: false, message: auth.error } as const;
  const status = parseSubmissionStatus(formData.get("status"));
  if (!status) return { success: false, message: "Invalid submission status." } as const;
  if (status === "published" || status === "reviewed") {
    return {
      success: false,
      message: "Use Review & Publish to resolve identity and create the Match Report.",
    } as const;
  }
  try {
    const submission = await updateSubmissionStatus(id, status);
    revalidateScouting();
    return { success: true, submission } as const;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not update submission.",
    } as const;
  }
}

export async function promoteFormSubmissionAction(submissionId: string) {
  const auth = await requireScoutingWriteUser();
  if (!auth.ok) return { success: false as const, message: auth.error };
  try {
    const result = await promoteFormSubmission(submissionId);
    revalidateScouting();
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Could not promote submission.",
    };
  }
}

export async function reprocessUnpromotedSubmissionsAction() {
  const auth = await requireScoutingWriteUser();
  if (!auth.ok) return { success: false as const, message: auth.error };
  try {
    const counts = await backfillUnpromotedSubmissions();
    revalidateScouting();
    return { success: true as const, counts };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Could not reprocess submissions.",
    };
  }
}

export async function reviewAndPublishFormSubmissionAction(formData: FormData) {
  const auth = await requireScoutingWriteUser();
  if (!auth.ok) return { success: false as const, message: auth.error };
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const opponentPlayerId = String(formData.get("opponentPlayerId") ?? "").trim() || null;
  const createPlayer = String(formData.get("createPlayer") ?? "") === "true";
  const playerDisplayName = String(formData.get("playerDisplayName") ?? "").trim() || null;
  const mapAlias = String(formData.get("mapAlias") ?? "").trim();
  if (!submissionId || !teamId) {
    return { success: false as const, message: "Canonical team is required to publish." };
  }
  try {
    if (mapAlias) {
      await mapScoutingTeamAlias(teamId, mapAlias);
    }
    const result = await reviewAndPublishFormSubmission({
      submissionId,
      teamId,
      opponentPlayerId,
      createPlayer,
      playerDisplayName,
    });
    revalidateScouting();
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Could not review and publish.",
    };
  }
}

export async function runScoutingDuplicateAuditAction() {
  const auth = await requireScoutingWriteUser();
  if (!auth.ok) return { success: false as const, message: auth.error };
  try {
    const counts = await runScoutingDuplicateAuditCounts();
    return { success: true as const, counts };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Could not run duplicate audit.",
    };
  }
}

export async function submitPublicScoutingFormAction(rawToken: string, formData: FormData) {
  const parsed = readPublicScoutingFormData(formData);
  if (!parsed.ok) return { success: false, message: parsed.message } as const;
  const result = await submitPublicForm(rawToken, parsed.payload);
  if ("error" in result) return { success: false, message: result.error } as const;
  return { success: true, id: result.id } as const;
}
