"use client";

import { useEffect, useState } from "react";

import OpenPersonAction from "@/components/OpenPersonAction";
import { typeClass, typeRole } from "@/components/typography";
import {
  loadRelatedPlayersForFamilyPersonAction,
  type RelatedPlayerRowDto,
} from "@/features/people/peopleReadActions";
import { PERSON_RELATIONSHIP_TYPE_LABELS } from "@/features/people/personRelationshipTypes";
import type { Person } from "@/features/people/types";
import { getDisplayName } from "@/features/people/utils";

function PlayerRow({ row }: { row: RelatedPlayerRowDto }) {
  const { person, relationship } = row;
  const name = getDisplayName(person);
  const relationshipLabel = PERSON_RELATIONSHIP_TYPE_LABELS[relationship.relationshipType];

  return (
    <div className="flex flex-col gap-1 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={typeRole.personName}>{name}</p>
          <p className={typeClass("metadataSm", "mt-0.5")}>{relationshipLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <OpenPersonAction href={`/team/${person.id}`} label="Open Player" />
        </div>
      </div>
    </div>
  );
}

/**
 * Thin Related Players Adaptive Workspace body (BP-040E).
 * Lists players linked to a family Person via person_relationships.
 * Row layout matches FamilyWorkspace Parents / Guardians list.
 */
export default function RelatedPlayersWorkspace({ person }: { person: Person }) {
  const [rows, setRows] = useState<RelatedPlayerRowDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadRelatedPlayersForFamilyPersonAction(person.id).then((next) => {
      if (cancelled) return;
      setRows(next);
    });
    return () => {
      cancelled = true;
    };
  }, [person.id]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className={typeRole.sectionTitle}>Related Players</h3>
        <p className={`mt-1 ${typeRole.metadata}`}>
          Players connected to this person through family relationships.
        </p>
      </div>

      {rows === null ? (
        <p className={typeRole.metadata}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className={typeRole.metadata}>No related players connected.</p>
      ) : (
        <div className="max-w-xl divide-y divide-border/60 border-y border-border/60">
          {rows.map((row) => (
            <PlayerRow key={row.relationship.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
