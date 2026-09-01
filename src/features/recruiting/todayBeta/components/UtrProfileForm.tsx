"use client";

import { useState, useTransition } from "react";

import { moduleFieldClass, modulePrimaryButtonClassSm } from "@/components/module-theme";

import { saveUtrExternalProfileAction } from "../actions";
import { parseUtrPlayerIdFromUrl } from "../utrProfile";

const INPUT_CLASS =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-primary";

export default function UtrProfileForm({
  recruitPersonId,
  recruitName,
  onSaved,
  onClose,
}: {
  recruitPersonId: string;
  recruitName: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [playerId, setPlayerId] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resolvePlayerId(): string | null {
    if (playerId.trim()) return playerId.trim();
    if (profileUrl.trim()) return parseUtrPlayerIdFromUrl(profileUrl);
    return null;
  }

  function handleSave() {
    const resolved = resolvePlayerId();
    if (!resolved) {
      setError("Enter a UTR player id or profile URL.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await saveUtrExternalProfileAction({
        recruitPersonId,
        playerId: resolved,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Link a UTR profile for <span className="font-medium text-text-primary">{recruitName}</span>.
      </p>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          UTR player id
        </span>
        <input
          className={INPUT_CLASS}
          value={playerId}
          onChange={(event) => setPlayerId(event.target.value)}
          placeholder="3186547"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Or profile URL
        </span>
        <input
          className={`${moduleFieldClass} text-sm`}
          value={profileUrl}
          onChange={(event) => setProfileUrl(event.target.value)}
          placeholder="https://app.utrsports.net/profiles/3186547"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={modulePrimaryButtonClassSm}
          onClick={handleSave}
          disabled={isPending}
        >
          Save UTR Profile
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-control border border-border px-3 text-xs font-semibold text-text-primary"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </button>
      </div>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
