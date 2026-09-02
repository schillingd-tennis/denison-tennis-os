"use client";

import { useCallback, useMemo, useState } from "react";

import { useSaveIndicator, type InlineCommitReason } from "@/components/inline-edit";

import { saveScheduleEventAction } from "./actions";
import {
  applyInlinePatch,
  buildInlinePatch,
  inlinePatchIsNoOp,
  scheduleEventToInput,
  type ScheduleInlineEditableField,
} from "./scheduleInline";
import type { TeamScheduleEvent } from "./types";

type EditingCell = {
  eventId: string;
  field: ScheduleInlineEditableField;
};

export function useScheduleInlineEdit({
  onEventUpdated,
}: {
  onEventUpdated: (event: TeamScheduleEvent) => void;
}) {
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const { status: saveStatus, error: saveError, runSave } = useSaveIndicator();

  const editingKey = useMemo(
    () => (editing ? `${editing.eventId}:${editing.field}` : null),
    [editing],
  );

  const isEditing = useCallback(
    (eventId: string, field: ScheduleInlineEditableField) => editingKey === `${eventId}:${field}`,
    [editingKey],
  );

  const startEdit = useCallback((eventId: string, field: ScheduleInlineEditableField) => {
    setFieldError(undefined);
    setEditing({ eventId, field });
  }, []);

  const cancelEdit = useCallback(() => {
    setFieldError(undefined);
    setEditing(null);
  }, []);

  const finishCommit = useCallback((reason: InlineCommitReason) => {
    setEditing(null);
    if (reason === "tab" || reason === "shift-tab") return;
  }, []);

  const commit = useCallback(
    async (
      event: TeamScheduleEvent,
      field: ScheduleInlineEditableField,
      raw: string,
      reason: InlineCommitReason,
    ) => {
      const patchResult = buildInlinePatch(event, field, raw);
      if ("error" in patchResult) {
        setFieldError(patchResult.error);
        return;
      }

      const { patch } = patchResult;
      if (inlinePatchIsNoOp(event, patch)) {
        setFieldError(undefined);
        finishCommit(reason);
        return;
      }

      setFieldError(undefined);
      const previous = event;
      const optimistic = applyInlinePatch(event, patch);
      onEventUpdated(optimistic);
      finishCommit(reason);

      const merged = { ...scheduleEventToInput(event), ...patch };
      const ok = await runSave(async () => {
        const result = await saveScheduleEventAction(event.id, merged);
        if (!result.success) throw new Error(result.error);
        onEventUpdated(result.event);
      });
      if (!ok) onEventUpdated(previous);
    },
    [finishCommit, onEventUpdated, runSave],
  );

  return {
    isEditing,
    startEdit,
    cancelEdit,
    commit,
    fieldError,
    saveStatus,
    saveError,
  };
}

export type ScheduleInlineEditApi = ReturnType<typeof useScheduleInlineEdit>;
