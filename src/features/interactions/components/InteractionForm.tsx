"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { addRecruitInteractionAction, updateRecruitInteractionAction } from "../actions";
import { dateFromOccurredAt } from "../formData";
import { createSaveLock } from "../saveLock";
import type { RecruitInteraction } from "../types";
import { INTERACTION_TYPES } from "../types";
import type { InteractionOption } from "../recruitSearch";
import RecruitSearchField from "./RecruitSearchField";

export type { InteractionOption };

export default function InteractionForm({
  recruits,
  tournaments,
  defaultRecruitId,
  lockRecruit = false,
  interaction,
  onSaved,
  onCancel,
}: {
  recruits: InteractionOption[];
  tournaments: InteractionOption[];
  defaultRecruitId?: string;
  lockRecruit?: boolean;
  interaction?: RecruitInteraction;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const saveLock = useRef(createSaveLock());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recruitPersonId, setRecruitPersonId] = useState(interaction?.recruitPersonId ?? defaultRecruitId ?? "");
  const editing = Boolean(interaction);
  const pinned = recruits.find((recruit) => recruit.id === (lockRecruit ? defaultRecruitId : recruitPersonId));

  function selectRecruit(id: string) {
    setRecruitPersonId(id);
    if (id) setError((current) => (current === "Select a recruit." ? null : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!recruitPersonId) {
      setError("Select a recruit.");
      return;
    }
    if (!saveLock.current.tryStart()) return;
    setSaving(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("recruitPersonId", recruitPersonId);
    if (interaction) formData.set("interactionId", interaction.id);
    try {
      if (editing) await updateRecruitInteractionAction(formData);
      else await addRecruitInteractionAction(formData);
      router.refresh();
      onSaved?.();
    } catch (reason) {
      saveLock.current.finish();
      setError(reason instanceof Error ? reason.message : "Could not save interaction.");
      setSaving(false);
    }
  }

  function cancel(event: { preventDefault(): void; stopPropagation(): void }) {
    event.preventDefault();
    event.stopPropagation();
    onCancel?.();
  }

  const control = "h-10 w-full rounded-control border border-border bg-surface px-3 text-sm font-normal text-text-primary";
  return (
    <form onSubmit={onSubmit} className="space-y-4 p-5">
      {interaction ? <input type="hidden" name="interactionId" value={interaction.id} /> : null}
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        {lockRecruit && pinned ? (
          <div className="text-xs font-semibold text-text-secondary">
            Recruit
            <input type="hidden" name="recruitPersonId" value={pinned.id} />
            <span className="mt-1 flex h-10 items-center rounded-control border border-border bg-surface px-3 text-sm font-normal text-text-primary">
              {pinned.label}
            </span>
          </div>
        ) : (
          <div className="min-w-0 text-xs font-semibold text-text-secondary">
            Recruit
            <RecruitSearchField recruits={recruits} selectedId={recruitPersonId} onSelect={selectRecruit} />
          </div>
        )}
        <label className="text-xs font-semibold text-text-secondary">
          Date
          <input
            name="occurredAt"
            type="date"
            required
            defaultValue={interaction ? dateFromOccurredAt(interaction.occurredAt) : new Date().toISOString().slice(0, 10)}
            className={`mt-1 ${control}`}
          />
        </label>
        <label className="text-xs font-semibold text-text-secondary">
          Type
          <select name="interactionType" defaultValue={interaction?.interactionType ?? "text"} className={`mt-1 ${control}`}>
            {INTERACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type[0].toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-text-secondary">
          Direction
          <select name="direction" defaultValue={interaction?.direction ?? "outbound"} className={`mt-1 ${control}`}>
            <option value="">Not specified</option>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
            <option value="two_way">Two-way</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-text-secondary">
          Tournament (optional)
          <select name="tournamentId" defaultValue={interaction?.tournamentId ?? ""} className={`mt-1 ${control}`}>
            <option value="">None</option>
            {tournaments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-text-secondary">
          Logged by
          <input name="loggedBy" defaultValue={interaction?.loggedBy ?? ""} className={`mt-1 ${control}`} />
        </label>
      </div>
      <label className="block text-xs font-semibold text-text-secondary">
        Notes
        <textarea name="notes" rows={5} defaultValue={interaction?.notes ?? ""} className={`mt-1 min-h-28 ${control} py-2`} />
      </label>
      <label className="block text-xs font-semibold text-text-secondary">
        Next steps
        <textarea name="nextSteps" rows={2} defaultValue={interaction?.nextSteps ?? ""} className={`mt-1 min-h-20 ${control} py-2`} />
      </label>
      {error ? <p className="text-sm text-denison-red">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          className="h-10 rounded-control border border-border px-4 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-control bg-denison-red px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Interaction"}
        </button>
      </div>
    </form>
  );
}
