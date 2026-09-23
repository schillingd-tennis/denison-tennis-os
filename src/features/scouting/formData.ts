import type { Handedness } from "./csvImport";
import type { FormSubmissionStatus, ImportStatus } from "./types";

export function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function parseDoubles(value: FormDataEntryValue | null) {
  if (value == null) return false;
  const text = String(value).trim().toLowerCase();
  return text === "true" || text === "on" || text === "1" || text === "yes";
}

export function parseHandedness(value: FormDataEntryValue | null): Handedness | null | undefined {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (text === "Right" || text === "Left") return text;
  return undefined;
}

export type DirectReportFormParse =
  | {
      ok: true;
      id: string | null;
      payload: {
        team_id: string;
        opponent_player_id: string | null;
        opponent_display_name: string;
        match_date: string | null;
        match_date_raw: string | null;
        handedness: Handedness | null;
        handedness_raw: string | null;
        strengths_weaknesses: string | null;
        scouting_report: string | null;
        report_by: string | null;
        is_doubles: boolean;
        source: "coach_entry";
        import_status: ImportStatus;
      };
    }
  | { ok: false; message: string };

export function readDirectReportFormData(formData: FormData): DirectReportFormParse {
  const id = String(formData.get("id") ?? "").trim() || null;
  const teamId = String(formData.get("teamId") ?? "").trim();
  if (!teamId) return { ok: false, message: "Team is required." };

  const opponentDisplayName = String(formData.get("opponentDisplayName") ?? "").trim();
  const handedness = parseHandedness(formData.get("handedness"));
  if (handedness === undefined) return { ok: false, message: "Handedness must be Right, Left, or blank." };

  const matchDate = optionalText(formData.get("matchDate"));

  return {
    ok: true,
    id,
    payload: {
      team_id: teamId,
      opponent_player_id: optionalText(formData.get("opponentPlayerId")),
      opponent_display_name: opponentDisplayName,
      match_date: matchDate,
      match_date_raw: matchDate,
      handedness,
      handedness_raw: handedness,
      strengths_weaknesses: optionalText(formData.get("strengthsWeaknesses")),
      scouting_report: optionalText(formData.get("scoutingReport")),
      report_by: optionalText(formData.get("reportBy")),
      is_doubles: parseDoubles(formData.get("isDoubles")),
      source: "coach_entry",
      import_status: "imported",
    },
  };
}

export type PublicFormParse =
  | {
      ok: true;
      payload: {
        opponentDisplayName: string;
        teamDisplayName: string;
        matchDate: string | null;
        handedness: Handedness | null;
        strengthsWeaknesses: string | null;
        scoutingReport: string | null;
        reportBy: string | null;
        isDoubles: boolean;
      };
    }
  | { ok: false; message: string };

export function readPublicScoutingFormData(formData: FormData): PublicFormParse {
  const opponentDisplayName = String(formData.get("opponentDisplayName") ?? "").trim();
  const strengthsWeaknesses = optionalText(formData.get("strengthsWeaknesses"));
  const scoutingReport = optionalText(formData.get("scoutingReport"));
  if (!opponentDisplayName && !strengthsWeaknesses && !scoutingReport) {
    return { ok: false, message: "Add an opponent name or report notes before submitting." };
  }
  const handedness = parseHandedness(formData.get("handedness"));
  if (handedness === undefined) return { ok: false, message: "Handedness must be Right, Left, or blank." };

  return {
    ok: true,
    payload: {
      opponentDisplayName,
      teamDisplayName: String(formData.get("teamDisplayName") ?? "").trim(),
      matchDate: optionalText(formData.get("matchDate")),
      handedness,
      strengthsWeaknesses,
      scoutingReport,
      reportBy: optionalText(formData.get("reportBy")),
      isDoubles: parseDoubles(formData.get("isDoubles")),
    },
  };
}

export function parseSubmissionStatus(value: FormDataEntryValue | null): FormSubmissionStatus | undefined {
  const text = String(value ?? "").trim();
  if (
    text === "new" ||
    text === "needs_review" ||
    text === "published" ||
    text === "archived" ||
    text === "rejected" ||
    text === "reviewed" ||
    text === "needs_clarification"
  ) {
    return text;
  }
  return undefined;
}

/** Statuses that may be set from the inbox without completing a publish review. */
export function isInboxOnlySubmissionStatus(status: FormSubmissionStatus): boolean {
  return status === "archived" || status === "rejected" || status === "new";
}
