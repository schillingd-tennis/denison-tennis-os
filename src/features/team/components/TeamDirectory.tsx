"use client";

import { useMemo, useState } from "react";

import type { Person } from "@/features/people/types";
import { filterPeople, type StatusFilter } from "@/features/people/utils";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import ViewToggle, { type ViewMode } from "@/components/ViewToggle";

import PlayerCard from "./PlayerCard";
import PlayerList from "./PlayerList";
import StatusFilterControl from "./StatusFilterControl";

export default function TeamDirectory({ people }: { people: Person[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("current");
  const [view, setView] = useState<ViewMode>("cards");

  const filtered = useMemo(
    () => filterPeople(people, { status, query }),
    [people, status, query],
  );

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Team"
        subtitle="Current players and alumni"
        meta={`${filtered.length} ${filtered.length === 1 ? "person" : "people"}`}
        actions={
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex h-10 cursor-not-allowed items-center rounded-control border border-border bg-app-background px-4 text-sm font-medium text-text-secondary"
          >
            Add Player · Coming Soon
          </button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name, hometown, or major"
        />
        <div className="flex flex-wrap items-center gap-3">
          <StatusFilterControl value={status} onChange={setStatus} />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No players found"
          description="Try a different search term or filter."
        />
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((person) => (
            <PlayerCard key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <PlayerList people={filtered} />
      )}
    </div>
  );
}
