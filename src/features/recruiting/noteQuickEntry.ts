/**
 * Shared Recruit note quick-entry targets.
 * Buttons set intent; Notes workspace consumes it (no duplicated fields/save).
 */
export type RecruitNoteQuickEntryField = "notes" | "gameNotes";

export type RecruitNoteQuickEntryRequest = {
  field: RecruitNoteQuickEntryField;
  /** Unique per tap so re-tapping the same action re-runs focus/scroll. */
  requestId: number;
};

export const RECRUIT_NOTES_WORKSPACE_ID = "notes" as const;
