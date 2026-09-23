"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { modulePrimaryButtonClassSm } from "@/components/module-theme";
import { updatePersonAction } from "@/features/people/actions";

import { rosterPlayerDisplayName } from "../resolvePlayers";
import type { RosterPlayer } from "../types";

export default function PlayerDisplayNameEditor({ player }: { player: RosterPlayer }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [preferredName, setPreferredName] = useState(player.preferredName?.trim() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await updatePersonAction(player.id, {
        preferredName: preferredName.trim() || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not update the player's display name.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">Denison display name</p>
          <p className="mt-0.5 font-medium">{rosterPlayerDisplayName(player)}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPreferredName(player.preferredName?.trim() ?? "");
            setError(null);
            setEditing(true);
          }}
          className="inline-flex h-8 items-center justify-center rounded-control border border-[var(--module-border)] bg-surface px-3 text-xs font-semibold text-[var(--module-accent)] transition-colors hover:bg-[var(--module-tint)]"
        >
          Edit name
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="rounded-card border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="grid gap-1 text-xs font-medium">
          Preferred first name
          <input
            autoFocus
            value={preferredName}
            onChange={(event) => setPreferredName(event.target.value)}
            placeholder={player.firstName}
            className="h-9 rounded-control border border-border bg-surface px-3 text-sm outline-none focus:border-[var(--module-accent)]"
          />
          <span className="font-normal text-text-secondary">
            Matches will display {preferredName.trim() || player.firstName} {player.lastName}. The player remains linked to the same Team record.
          </span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              setEditing(false);
            }}
            className="inline-flex h-9 items-center justify-center rounded-control border border-border bg-surface px-3 text-sm font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button type="submit" disabled={busy} className={modulePrimaryButtonClassSm}>
            {busy ? "Saving…" : "Save name"}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
