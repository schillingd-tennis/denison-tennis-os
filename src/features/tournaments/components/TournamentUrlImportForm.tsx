"use client";

import { useState, useTransition } from "react";
import { Link2, Search } from "lucide-react";

import { moduleFieldClass, modulePrimaryButtonClass } from "@/components/module-theme";
import type { RecruitDirectoryRow } from "@/features/recruiting/directory";

import { importTournamentUrlAction } from "../actions";
import type { Tournament } from "../types";
import TournamentForm from "./TournamentForm";

export default function TournamentUrlImportForm({
  recruits,
  onCancel,
  onSaved,
}: {
  recruits: RecruitDirectoryRow[];
  onCancel: () => void;
  onSaved: (tournament: Tournament) => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [imported, setImported] = useState<Awaited<ReturnType<typeof importTournamentUrlAction>> | null>(null);

  if (imported?.success) {
    return (
      <div className="space-y-4">
        <div className="rounded-control border border-success/25 bg-success/5 px-4 py-3">
          <p className="text-sm font-semibold text-text-primary">Details found from {imported.imported.source}</p>
          <p className="mt-1 text-xs text-text-secondary">
            Review every field below, make any changes, then add the tournament to the database.
          </p>
          {imported.imported.warnings.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-warning">
              {imported.imported.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          ) : null}
        </div>
        <TournamentForm
          initialInput={imported.imported.input}
          recruits={recruits}
          onCancel={onCancel}
          onSaved={onSaved}
        />
      </div>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await importTournamentUrlAction(url);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setImported(result);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-control border border-border bg-app-background px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-denison-red/10 p-2 text-denison-red"><Link2 size={18} /></span>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Paste a tournament link</h3>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Denison Tennis OS will collect the published name, dates, venue, city, state, level,
              registration timing, surface, and source link when available.
            </p>
          </div>
        </div>
      </div>
      <label className="block space-y-2">
        <span className="text-xs font-semibold tracking-wide text-text-secondary uppercase">Tournament URL</span>
        <input
          type="url"
          className={moduleFieldClass}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://playtennis.usta.com/…"
          required
          autoFocus
        />
      </label>
      {error ? (
        <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <button type="button" onClick={onCancel} className="h-10 rounded-control border border-border px-4 text-sm font-medium">
          Cancel
        </button>
        <button type="submit" disabled={pending} className={modulePrimaryButtonClass}>
          <Search size={16} /> {pending ? "Reading tournament…" : "Get tournament details"}
        </button>
      </div>
    </form>
  );
}
