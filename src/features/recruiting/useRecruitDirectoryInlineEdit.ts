"use client";

/**
 * Shared Recruiting directory inline-edit commit path for List / Card / Rank.
 * Reuses BP-045 validation + actions; does not invent a second write mechanism.
 */
import { useCallback, useMemo, useState } from "react";

import { isValidUtr, isValidWtn, toOptionalNumber } from "@/components/editor";
import {
  useSaveIndicator,
  type InlineCommitReason,
} from "@/components/inline-edit";
import { updatePersonAction } from "@/features/people/actions";
import { toPersonWritePatch } from "@/features/people/personWritePatch";
import type { Person } from "@/features/people/types";

import { applyCoachRankOrderAction, updateRecruitProfileAction } from "./actions";
import {
  appendRankedToTierSection,
  applyCoachRanksToCohort,
  rankedPersonIdsForClass,
} from "./coachRank";
import type { RecruitDirectoryRow } from "./directory";
import {
  optimisticLookupProfile,
  replacePersonInCohort,
  replaceProfileInCohort,
  type RecruitingDirectoryEditableField,
} from "./directoryInline";
import { parseRecruitTier, type TierSectionId } from "./tier";

type EditingCell = {
  personId: string;
  field: RecruitingDirectoryEditableField;
};

function isValidTrnRank(value: number): string | undefined {
  if (!Number.isFinite(value) || value <= 0) return "TRN rank must be a positive number.";
  return undefined;
}

export function useRecruitDirectoryInlineEdit({
  cohort,
  onCohortChange,
}: {
  cohort: RecruitDirectoryRow[];
  onCohortChange: (rows: RecruitDirectoryRow[]) => void;
}) {
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const { status: saveStatus, error: saveError, runSave } = useSaveIndicator();

  const editingKey = useMemo(
    () => (editing ? `${editing.personId}:${editing.field}` : null),
    [editing],
  );

  const isEditing = useCallback(
    (personId: string, field: RecruitingDirectoryEditableField) =>
      editingKey === `${personId}:${field}`,
    [editingKey],
  );

  const startEdit = useCallback(
    (personId: string, field: RecruitingDirectoryEditableField) => {
      setFieldError(undefined);
      setEditing({ personId, field });
    },
    [],
  );

  const cancelEdit = useCallback(() => {
    setFieldError(undefined);
    setEditing(null);
  }, []);

  const finishCommit = useCallback((reason: InlineCommitReason) => {
    if (reason === "tab" || reason === "shift-tab") {
      // Surfaces without tab navigation simply exit edit.
      setEditing(null);
      return;
    }
    setEditing(null);
  }, []);

  const commit = useCallback(
    async (
      personId: string,
      field: RecruitingDirectoryEditableField,
      raw: string,
      reason: InlineCommitReason,
    ) => {
      const current = cohort.find((row) => row.person.id === personId);
      if (!current) {
        setEditing(null);
        return;
      }

      if (
        field === "pipelineStage" ||
        field === "priority" ||
        field === "interest" ||
        field === "outcome" ||
        field === "getability"
      ) {
        const currentId =
          field === "pipelineStage"
            ? (current.profile.pipelineStageId ?? "")
            : field === "priority"
              ? (current.profile.priorityId ?? "")
              : field === "getability"
                ? (current.profile.getabilityId ?? "")
                : field === "outcome"
                  ? (current.profile.outcomeId ?? "")
                  : (current.profile.interestId ?? "");
        if (raw === currentId) {
          finishCommit(reason);
          return;
        }

        const previous = cohort;
        const optimistic = optimisticLookupProfile(current.profile, field, raw);
        onCohortChange(replaceProfileInCohort(cohort, personId, optimistic));
        finishCommit(reason);

        const patchKey =
          field === "pipelineStage"
            ? "pipelineStageId"
            : field === "priority"
              ? "priorityId"
              : field === "getability"
                ? "getabilityId"
                : field === "outcome"
                  ? "outcomeId"
                  : "interestId";
        const ok = await runSave(async () => {
          const result = await updateRecruitProfileAction(personId, {
            [patchKey]: raw || null,
          });
          if (!result.success) throw new Error(result.error);
          onCohortChange(replaceProfileInCohort(previous, personId, result.profile));
        });
        if (!ok) onCohortChange(previous);
        return;
      }

      if (field === "tier") {
        const parsed = parseRecruitTier(raw);
        if (parsed === undefined) {
          setFieldError("Tier must be 1–5 or blank.");
          return;
        }
        const currentTier = current.profile.tier ?? null;
        if (currentTier === parsed) {
          finishCommit(reason);
          return;
        }

        const previous = cohort;
        const classYear = current.profile.recruitClassYear;
        const isRanked = current.profile.coachRank !== undefined;
        const toSection: TierSectionId = parsed === null ? "unassigned" : parsed;

        // Ranked: append to bottom of destination tier and densify board order.
        if (isRanked && classYear != null) {
          const classRanked = cohort.filter(
            (row) =>
              row.profile.recruitClassYear === classYear &&
              row.profile.coachRank !== undefined,
          );
          const boardMove = appendRankedToTierSection({
            rankedRows: classRanked,
            personId,
            toSection,
          });
          let optimisticCohort = applyCoachRanksToCohort(
            cohort,
            classYear,
            boardMove.nextVisibleOrder,
          );
          optimisticCohort = replaceProfileInCohort(optimisticCohort, personId, {
            ...current.profile,
            tier: parsed === null ? undefined : parsed,
            coachRank: boardMove.nextVisibleOrder.indexOf(personId) + 1,
          });
          onCohortChange(optimisticCohort);
          finishCommit(reason);

          const ok = await runSave(async () => {
            const tierResult = await updateRecruitProfileAction(personId, {
              tier: parsed,
            });
            if (!tierResult.success) throw new Error(tierResult.error);
            const orderResult = await applyCoachRankOrderAction(
              classYear,
              boardMove.nextVisibleOrder,
            );
            if (!orderResult.success) throw new Error(orderResult.error);
            let next = applyCoachRanksToCohort(
              previous,
              classYear,
              orderResult.board.rankedPersonIds,
            );
            next = replaceProfileInCohort(next, personId, tierResult.profile);
            onCohortChange(next);
          });
          if (!ok) onCohortChange(previous);
          return;
        }

        const optimistic = {
          ...current.profile,
          tier: parsed === null ? undefined : parsed,
        };
        onCohortChange(replaceProfileInCohort(cohort, personId, optimistic));
        finishCommit(reason);

        const ok = await runSave(async () => {
          const result = await updateRecruitProfileAction(personId, {
            tier: parsed,
          });
          if (!result.success) throw new Error(result.error);
          onCohortChange(replaceProfileInCohort(previous, personId, result.profile));
        });
        if (!ok) onCohortChange(previous);
        return;
      }

      if (field === "schoolChosen") {
        const currentValue = current.profile.schoolChosen ?? "";
        const nextValue = raw.trim();
        if (nextValue === currentValue) {
          finishCommit(reason);
          return;
        }

        const previous = cohort;
        const optimistic = {
          ...current.profile,
          schoolChosen: nextValue || undefined,
        };
        onCohortChange(replaceProfileInCohort(cohort, personId, optimistic));
        finishCommit(reason);

        const ok = await runSave(async () => {
          const result = await updateRecruitProfileAction(personId, {
            schoolChosen: nextValue || null,
          });
          if (!result.success) throw new Error(result.error);
          onCohortChange(replaceProfileInCohort(previous, personId, result.profile));
        });
        if (!ok) onCohortChange(previous);
        return;
      }

      if (field === "recruitClassYear") {
        const currentYear = current.profile.recruitClassYear;
        const nextYear =
          raw.trim() === ""
            ? null
            : (() => {
                const parsed = Number(raw);
                return Number.isInteger(parsed) ? parsed : Number.NaN;
              })();
        if (Number.isNaN(nextYear as number)) {
          setFieldError("Class year must be a whole number.");
          return;
        }
        if ((currentYear ?? null) === nextYear) {
          finishCommit(reason);
          return;
        }

        const previous = cohort;
        const optimistic = {
          ...current.profile,
          recruitClassYear: nextYear === null ? undefined : nextYear,
          // Class-year reassignment clears Coach Rank via Phase B engine;
          // optimistic UI mirrors that until the server profile returns.
          coachRank: undefined,
        };
        const oldYear = currentYear ?? undefined;
        let optimisticCohort = replaceProfileInCohort(cohort, personId, optimistic);
        if (oldYear !== undefined) {
          optimisticCohort = applyCoachRanksToCohort(
            optimisticCohort,
            oldYear,
            rankedPersonIdsForClass(optimisticCohort, oldYear),
          );
        }
        onCohortChange(optimisticCohort);
        finishCommit(reason);

        const ok = await runSave(async () => {
          const result = await updateRecruitProfileAction(personId, {
            recruitClassYear: nextYear,
          });
          if (!result.success) throw new Error(result.error);
          let next = replaceProfileInCohort(previous, personId, result.profile);
          if (oldYear !== undefined) {
            next = applyCoachRanksToCohort(
              next,
              oldYear,
              rankedPersonIdsForClass(next, oldYear),
            );
          }
          onCohortChange(next);
        });
        if (!ok) onCohortChange(previous);
        return;
      }

      let personPatch: Partial<Person>;
      if (field === "utr") {
        if (raw.trim() === "") personPatch = { utr: undefined };
        else {
          const value = toOptionalNumber(raw);
          if (value === undefined) {
            setFieldError("UTR must be a number.");
            return;
          }
          const error = isValidUtr(value);
          if (error) {
            setFieldError(error);
            return;
          }
          personPatch = { utr: value };
        }
      } else if (field === "wtn") {
        if (raw.trim() === "") personPatch = { wtn: undefined };
        else {
          const value = toOptionalNumber(raw);
          if (value === undefined) {
            setFieldError("WTN must be a number.");
            return;
          }
          const error = isValidWtn(value);
          if (error) {
            setFieldError(error);
            return;
          }
          personPatch = { wtn: value };
        }
      } else {
        if (raw.trim() === "") personPatch = { trnRank: undefined };
        else {
          const value = toOptionalNumber(raw);
          if (value === undefined) {
            setFieldError("TRN rank must be a number.");
            return;
          }
          const error = isValidTrnRank(value);
          if (error) {
            setFieldError(error);
            return;
          }
          personPatch = { trnRank: value };
        }
      }

      setFieldError(undefined);
      const key = field === "trnRank" ? "trnRank" : field;
      if (current.person[key] === personPatch[key]) {
        finishCommit(reason);
        return;
      }

      const previous = cohort;
      const optimisticPerson = { ...current.person, ...personPatch };
      onCohortChange(replacePersonInCohort(cohort, personId, optimisticPerson));
      finishCommit(reason);

      const ok = await runSave(async () => {
        const result = await updatePersonAction(personId, toPersonWritePatch(personPatch));
        if (!result.success) throw new Error(result.error);
        onCohortChange(replacePersonInCohort(previous, personId, result.person));
      });
      if (!ok) onCohortChange(previous);
    },
    [cohort, finishCommit, onCohortChange, runSave],
  );

  return {
    isEditing,
    startEdit,
    cancelEdit,
    commit,
    fieldError,
    saveStatus,
    saveError,
    /** List tab-navigation still needs the raw editing cell. */
    editing,
    setEditing,
    setFieldError,
  };
}
