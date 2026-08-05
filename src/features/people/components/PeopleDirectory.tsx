"use client";

import { useEffect, useMemo, useState } from "react";

import { publishFoundSet } from "@/components/found-set";
import type { Person } from "@/features/people/types";
import { filterPeople, type RoleFilter } from "@/features/people/utils";
import {
  TEAM_FOUND_SET_COLUMNS,
  TEAM_FOUND_SET_FILENAME_BASE,
  TEAM_FOUND_SET_MODULE_KEY,
} from "@/features/people/foundSet";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import ViewToggle, { type ViewMode } from "@/components/ViewToggle";

import PersonCard from "./PersonCard";
import PersonList from "./PersonList";
import RoleFilterControl from "./RoleFilterControl";

/**
 * Team directory surface for the People domain.
 * Nav label and `/team` routes stay "Team"; data model is People.
 */
export default function PeopleDirectory({ people }: { people: Person[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("players");
  const [view, setView] = useState<ViewMode>("list");

  const filtered = useMemo(
    () => filterPeople(people, { role, query }),
    [people, role, query],
  );

  useEffect(() => {
    if (view !== "cards") return;
    publishFoundSet({
      moduleKey: TEAM_FOUND_SET_MODULE_KEY,
      filenameBase: TEAM_FOUND_SET_FILENAME_BASE,
      rows: filtered,
      columns: TEAM_FOUND_SET_COLUMNS,
    });
  }, [view, filtered]);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        title="Team"
        subtitle="People in the Denison Tennis program"
        meta={`${filtered.length} ${filtered.length === 1 ? "person" : "people"}`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 sm:max-w-md">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by name, title, hometown, or major"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <RoleFilterControl value={role} onChange={setRole} />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No people found"
          description="Try a different search term or filter."
        />
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <PersonList people={filtered} />
      )}
    </div>
  );
}
