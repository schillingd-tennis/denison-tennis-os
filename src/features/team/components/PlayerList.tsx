import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Person } from "@/features/people/types";
import {
  getDisplayName,
  getHometown,
  getInitials,
  getStatusLabel,
  getStatusTone,
} from "@/features/people/utils";

import PlayerAvatar from "@/components/PlayerAvatar";
import StatusBadge from "@/components/StatusBadge";

export default function PlayerList({ people }: { people: Person[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      {/* Desktop / tablet: compact table */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-border text-xs font-medium tracking-wide text-text-secondary uppercase">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Class</th>
            <th className="px-4 py-3 font-medium">Hometown</th>
            <th className="px-4 py-3 font-medium">Major</th>
            <th className="px-4 py-3 font-medium">UTR</th>
            <th className="px-4 py-3 text-right font-medium">Workspace</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => {
            const displayName = getDisplayName(person);
            const hometown = getHometown(person);

            return (
              <tr
                key={person.id}
                className="border-b border-border last:border-b-0 hover:bg-app-background"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/team/${person.id}`}
                    className="flex items-center gap-3"
                  >
                    <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={32} />
                    <span className="font-medium text-text-primary">{displayName}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={getStatusLabel(person.status)}
                    tone={getStatusTone(person.status)}
                  />
                </td>
                <td className="px-4 py-3 text-text-secondary">{person.classYear ?? "—"}</td>
                <td className="px-4 py-3 text-text-secondary">{hometown ?? "—"}</td>
                <td className="px-4 py-3 text-text-secondary">{person.major ?? "—"}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {person.utr !== undefined ? person.utr.toFixed(1) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/team/${person.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-denison-red hover:underline"
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
      <ul className="divide-y divide-border md:hidden">
        {people.map((person) => {
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
              <Link href={`/team/${person.id}`} className="flex items-center gap-3 px-4 py-4">
                <PlayerAvatar photoUrl={person.photoUrl} initials={getInitials(person)} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-text-primary">{displayName}</p>
                    <StatusBadge
                      label={getStatusLabel(person.status)}
                      tone={getStatusTone(person.status)}
                    />
                  </div>
                  {detailLine ? (
                    <p className="mt-0.5 truncate text-sm text-text-secondary">{detailLine}</p>
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
