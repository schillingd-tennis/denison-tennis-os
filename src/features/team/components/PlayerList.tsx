"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ColumnDef } from "@/components/data-table/types";
import { useSortableData } from "@/components/data-table/useSortableData";
import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";

import type { Person, PersonStatus } from "@/features/people/types";
import {
  getDisplayName,
  getHometown,
  getInitials,
  getStatusLabel,
  getStatusTone,
} from "@/features/people/utils";

import PlayerAvatar from "@/components/PlayerAvatar";
import StatusBadge from "@/components/StatusBadge";

type PersonColumnKey =
  | "name"
  | "status"
  | "classYear"
  | "hometown"
  | "major"
  | "utr"
  | "wtn";

/**
 * Column definitions for the Team List view — the reference implementation
 * of the Universal DataTable sorting architecture (see
 * `@/components/data-table`). Each column declares its own `sortType` so
 * the engine compares it correctly instead of guessing:
 *
 * - `text` — Name, Hometown, Major (alphabetical, case-insensitive, trimmed)
 * - `number` — Class, UTR, WTN (true numeric comparison)
 * - `enum` — Status (explicit Current-before-Alumni order, not alphabetical
 *   — "Alumni" would otherwise sort before "Current")
 *
 * `dateOfBirth`/`createdAt`/`updatedAt` on `Person` would use `sortType:
 * "date"`, and a column needing bespoke logic would use `sortType:
 * "custom"` with its own `comparator` — both are fully supported by the
 * engine even though no current Team column needs them.
 *
 * Future modules (Recruiting, Operations, Research Lab, etc.) should follow
 * this same pattern: a small `ColumnDef[]` array passed to
 * `useSortableData` — the sorting engine itself needs no Team-specific code.
 */
const columns: ColumnDef<Person, PersonColumnKey>[] = [
  {
    id: "name",
    title: "Name",
    sortable: true,
    sortType: "text",
    accessor: (person) => getDisplayName(person),
    defaultSort: "asc",
  },
  {
    id: "status",
    title: "Status",
    sortable: true,
    sortType: "enum",
    accessor: (person) => person.status,
    // Explicit order — Current before Alumni, not alphabetical.
    enumOrder: ["current", "alumni"] satisfies PersonStatus[],
    defaultSort: "asc",
  },
  {
    id: "classYear",
    title: "Class",
    sortable: true,
    sortType: "number",
    accessor: (person) => person.classYear,
    defaultSort: "asc",
  },
  {
    id: "hometown",
    title: "Hometown",
    sortable: true,
    sortType: "text",
    accessor: (person) => getHometown(person),
    defaultSort: "asc",
  },
  {
    id: "major",
    title: "Major",
    sortable: true,
    sortType: "text",
    accessor: (person) => person.major,
    defaultSort: "asc",
  },
  {
    id: "utr",
    title: "UTR",
    sortable: true,
    sortType: "number",
    accessor: (person) => person.utr,
    // Highest-rated first on the first click — more useful than ascending.
    defaultSort: "desc",
  },
  {
    id: "wtn",
    title: "WTN",
    sortable: true,
    sortType: "number",
    accessor: (person) => person.wtn,
    defaultSort: "desc",
  },
];

export default function PlayerList({ people }: { people: Person[] }) {
  const { sortedItems, sort, toggleSort } = useSortableData(people, columns);

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      {/* Desktop / tablet: compact table */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-border text-xs font-medium tracking-wide text-text-secondary uppercase">
            {columns.map((column) => (
              <SortableColumnHeader
                key={column.id}
                label={column.title}
                align={column.align}
                sortDirection={sort?.key === column.id ? sort.direction : null}
                onSort={() => toggleSort(column.id)}
              />
            ))}
            <th className="px-5 py-3.5 text-right font-medium">Workspace</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((person) => {
            const displayName = getDisplayName(person);
            const hometown = getHometown(person);

            return (
              <tr
                key={person.id}
                className="border-b border-border/60 transition-colors duration-150 last:border-b-0 hover:bg-app-background"
              >
                <td className="px-5 py-4">
                  <Link
                    href={`/team/${person.id}`}
                    className="flex items-center gap-3.5"
                  >
                    <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={36} />
                    <span className="text-[15px] font-semibold text-text-primary">{displayName}</span>
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge
                    label={getStatusLabel(person.status)}
                    tone={getStatusTone(person.status)}
                  />
                </td>
                <td className="px-5 py-4 text-text-secondary">{person.classYear ?? "—"}</td>
                <td className="px-5 py-4 text-text-secondary">{hometown ?? "—"}</td>
                <td className="px-5 py-4 text-text-secondary">{person.major ?? "—"}</td>
                <td className="px-5 py-4 text-text-secondary">
                  {person.utr !== undefined ? person.utr.toFixed(1) : "—"}
                </td>
                <td className="px-5 py-4 text-text-secondary">
                  {person.wtn !== undefined ? person.wtn.toFixed(1) : "—"}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/team/${person.id}`}
                    className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors duration-150 hover:text-denison-red"
                  >
                    Open
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile: stacked records, no horizontal scrolling */}
      <ul className="divide-y divide-border/60 md:hidden">
        {sortedItems.map((person) => {
          const displayName = getDisplayName(person);
          const hometown = getHometown(person);
          const detailLine = [
            person.classYear ? `Class of ${person.classYear}` : null,
            hometown,
            person.major,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li key={person.id}>
              <Link
                href={`/team/${person.id}`}
                className="flex items-center gap-3.5 px-5 py-5 transition-colors duration-150 active:bg-app-background"
              >
                <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[15px] font-semibold text-text-primary">{displayName}</p>
                    <StatusBadge
                      label={getStatusLabel(person.status)}
                      tone={getStatusTone(person.status)}
                    />
                  </div>
                  {detailLine ? (
                    <p className="mt-1 truncate text-sm text-text-secondary">{detailLine}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
