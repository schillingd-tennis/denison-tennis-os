"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { formatPhoneDisplay } from "@/components/inline-edit";
import RoleBadge from "@/components/RoleBadge";
import { typeClass, typeRole } from "@/components/typography";
import { useDrawerManager } from "@/components/workspace-drawer";
import {
  createParentForPlayerAction,
  linkPersonAsParentAction,
} from "@/features/people/parentActions";
import {
  listRelationshipsForPerson,
  PERSON_RELATIONSHIP_TYPE_LABELS,
  type PersonRelationshipRecord,
  type PersonRelationshipType,
} from "@/features/people/personRelationships";
import { listPeople, getPersonById } from "@/features/people/repository";
import type { Person } from "@/features/people/types";
import { getDisplayName, matchesSearch } from "@/features/people/utils";

export type FamilyWorkspaceSummary = {
  parentCount: number;
  hasEmergencyContact: boolean;
};

type FamilyParentRow = {
  relationship: PersonRelationshipRecord;
  person: Person;
};

const RELATIONSHIP_OPTIONS: { value: PersonRelationshipType; label: string }[] = [
  { value: "mother", label: PERSON_RELATIONSHIP_TYPE_LABELS.mother },
  { value: "father", label: PERSON_RELATIONSHIP_TYPE_LABELS.father },
  { value: "guardian", label: PERSON_RELATIONSHIP_TYPE_LABELS.guardian },
  { value: "other", label: PERSON_RELATIONSHIP_TYPE_LABELS.other },
];

const fieldClass =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-denison-red focus:ring-1 focus:ring-denison-red";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-control bg-denison-red px-4 text-sm font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

const secondaryButtonClass =
  "inline-flex h-10 w-full items-center justify-center rounded-control border border-border px-4 text-sm font-medium text-text-primary transition-colors hover:border-text-secondary/60";

function summarize(rows: FamilyParentRow[]): FamilyWorkspaceSummary {
  return {
    parentCount: rows.length,
    hasEmergencyContact: rows.some((row) => row.relationship.isEmergencyContact),
  };
}

async function loadFamilyParentRows(playerId: string): Promise<FamilyParentRow[]> {
  const relationships = await listRelationshipsForPerson(playerId);
  const rows: FamilyParentRow[] = [];

  for (const relationship of relationships) {
    const person = await getPersonById(relationship.relatedPersonId);
    if (person) {
      rows.push({ relationship, person });
    }
  }

  return rows;
}

function AddParentFlow({
  player,
  linkedPersonIds,
  onSuccess,
}: {
  player: Person;
  linkedPersonIds: ReadonlySet<string>;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"choose" | "create" | "link">("choose");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [relationshipType, setRelationshipType] = useState<PersonRelationshipType | "">("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [linkQuery, setLinkQuery] = useState("");
  const [candidates, setCandidates] = useState<Person[] | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [linkRelationshipType, setLinkRelationshipType] = useState<PersonRelationshipType | "">(
    "",
  );

  useEffect(() => {
    if (step !== "link") return;
    let cancelled = false;
    void listPeople()
      .then((people) => {
        if (cancelled) return;
        setCandidates(
          people.filter(
            (person) =>
              person.id !== player.id && !linkedPersonIds.has(person.id),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setCandidates([]);
          setError("Could not load people to link.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [linkedPersonIds, player.id, step]);

  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    return candidates
      .filter((person) => matchesSearch(person, linkQuery))
      .slice(0, 25);
  }, [candidates, linkQuery]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!relationshipType) {
      setError("Relationship type is required.");
      return;
    }
    setSaving(true);
    try {
      const result = await createParentForPlayerAction({
        playerId: player.id,
        firstName,
        lastName,
        relationshipType,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  async function handleLink(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!selectedPersonId) {
      setError("Select a person to link.");
      return;
    }
    if (!linkRelationshipType) {
      setError("Relationship type is required.");
      return;
    }
    setSaving(true);
    try {
      const result = await linkPersonAsParentAction({
        playerId: player.id,
        relatedPersonId: selectedPersonId,
        relationshipType: linkRelationshipType,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  if (step === "choose") {
    return (
      <div className="flex flex-col gap-3">
        <p className={typeRole.metadata}>
          Connect a parent or guardian to {getDisplayName(player)}.
        </p>
        <button type="button" className={secondaryButtonClass} onClick={() => setStep("create")}>
          Create New Parent
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => {
            setCandidates(null);
            setSelectedPersonId(null);
            setLinkQuery("");
            setLinkRelationshipType("");
            setError(undefined);
            setStep("link");
          }}
        >
          Link Existing Person
        </button>
      </div>
    );
  }

  if (step === "create") {
    return (
      <form className="flex flex-col gap-4" onSubmit={handleCreate}>
        <button
          type="button"
          className="self-start text-sm font-medium text-text-secondary hover:text-text-primary"
          onClick={() => {
            setError(undefined);
            setStep("choose");
          }}
        >
          ← Back
        </button>
        <label className="flex flex-col gap-1.5">
          <span className={typeRole.sectionLabel}>First name</span>
          <input
            className={fieldClass}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
            autoComplete="given-name"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={typeRole.sectionLabel}>Last name</span>
          <input
            className={fieldClass}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
            autoComplete="family-name"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={typeRole.sectionLabel}>Relationship</span>
          <select
            className={fieldClass}
            value={relationshipType}
            onChange={(event) =>
              setRelationshipType(event.target.value as PersonRelationshipType | "")
            }
            required
          >
            <option value="">Select…</option>
            {RELATIONSHIP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={typeRole.sectionLabel}>Email (optional)</span>
          <input
            className={fieldClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={typeRole.sectionLabel}>Phone (optional)</span>
          <input
            className={fieldClass}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button type="submit" className={primaryButtonClass} disabled={saving}>
          {saving ? "Creating…" : "Create Parent"}
        </button>
      </form>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleLink}>
      <button
        type="button"
        className="self-start text-sm font-medium text-text-secondary hover:text-text-primary"
        onClick={() => {
          setError(undefined);
          setStep("choose");
        }}
      >
        ← Back
      </button>
      <label className="flex flex-col gap-1.5">
        <span className={typeRole.sectionLabel}>Search people</span>
        <input
          className={fieldClass}
          value={linkQuery}
          onChange={(event) => setLinkQuery(event.target.value)}
          placeholder="Name, email, phone…"
        />
      </label>
      <div className="max-h-56 overflow-y-auto rounded-control border border-border/70">
        {candidates === null ? (
          <p className={`px-3 py-3 ${typeRole.metadata}`}>Loading people…</p>
        ) : filteredCandidates.length === 0 ? (
          <p className={`px-3 py-3 ${typeRole.metadata}`}>No matching people.</p>
        ) : (
          <ul role="listbox" aria-label="People to link">
            {filteredCandidates.map((person) => {
              const selected = selectedPersonId === person.id;
              return (
                <li key={person.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`flex w-full flex-col items-start gap-0.5 border-b border-border/40 px-3 py-2.5 text-left last:border-b-0 ${
                      selected ? "bg-denison-red/10" : "hover:bg-app-background"
                    }`}
                    onClick={() => setSelectedPersonId(person.id)}
                  >
                    <span className="text-sm font-medium text-text-primary">
                      {getDisplayName(person)}
                    </span>
                    <span className={typeClass("metadataSm")}>
                      {person.role.label}
                      {person.personalEmail ? ` · ${person.personalEmail}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={typeRole.sectionLabel}>Relationship</span>
        <select
          className={fieldClass}
          value={linkRelationshipType}
          onChange={(event) =>
            setLinkRelationshipType(event.target.value as PersonRelationshipType | "")
          }
          required
        >
          <option value="">Select…</option>
          {RELATIONSHIP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        className={primaryButtonClass}
        disabled={saving || !selectedPersonId}
      >
        {saving ? "Linking…" : "Link Person"}
      </button>
    </form>
  );
}

function ParentRow({ row }: { row: FamilyParentRow }) {
  const { person, relationship } = row;
  const name = getDisplayName(person);
  const relationshipLabel = PERSON_RELATIONSHIP_TYPE_LABELS[relationship.relationshipType];
  const phoneDisplay = formatPhoneDisplay(person.cellPhone);
  const email = person.personalEmail?.trim() || person.denisonEmail?.trim();
  const flags = [
    relationship.isPrimaryContact ? "Primary" : null,
    relationship.isEmergencyContact ? "Emergency" : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3 rounded-control border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={typeRole.personName}>{name}</p>
          <p className={typeClass("metadataSm", "mt-0.5")}>{relationshipLabel}</p>
        </div>
        <Link
          href={`/team/${person.id}`}
          className="shrink-0 text-sm font-medium text-denison-red hover:opacity-90"
        >
          Open Person
        </Link>
      </div>
      {flags.length > 0 ? (
        <RoleBadge label={flags.join(" · ")} className="self-start" />
      ) : null}
      {phoneDisplay || email ? (
        <div className={`flex flex-col gap-1 ${typeRole.metadata}`}>
          {phoneDisplay ? <p>{phoneDisplay}</p> : null}
          {email ? <p className="truncate">{email}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Family Adaptive Workspace body (B2C) — Player → Parents / Guardians.
 * Shell stays in PersonWorkspace; Add Parent uses DrawerManager.
 */
export default function FamilyWorkspace({
  player,
  onSummaryChange,
}: {
  player: Person;
  onSummaryChange: (summary: FamilyWorkspaceSummary) => void;
}) {
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [rows, setRows] = useState<FamilyParentRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | undefined>();

  const applyRows = useCallback(
    (next: FamilyParentRow[]) => {
      setRows(next);
      onSummaryChange(summarize(next));
    },
    [onSummaryChange],
  );

  const refresh = useCallback(async () => {
    try {
      const next = await loadFamilyParentRows(player.id);
      applyRows(next);
      setLoadError(undefined);
    } catch {
      applyRows([]);
      setLoadError("Could not load family relationships.");
    }
  }, [applyRows, player.id]);

  useEffect(() => {
    let cancelled = false;
    void loadFamilyParentRows(player.id)
      .then((next) => {
        if (cancelled) return;
        applyRows(next);
        setLoadError(undefined);
      })
      .catch(() => {
        if (cancelled) return;
        applyRows([]);
        setLoadError("Could not load family relationships.");
      });
    return () => {
      cancelled = true;
    };
  }, [applyRows, player.id]);

  const linkedPersonIds = useMemo(
    () => new Set((rows ?? []).map((row) => row.person.id)),
    [rows],
  );

  function openAddParentDrawer() {
    openDrawer({
      id: "family-add-parent",
      title: "Add Parent",
      subtitle: getDisplayName(player),
      content: (
        <AddParentFlow
          player={player}
          linkedPersonIds={linkedPersonIds}
          onSuccess={() => {
            closeDrawer();
            void refresh();
          }}
        />
      ),
      cancelAction: {
        label: "Cancel",
        onClick: () => closeDrawer(),
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={typeRole.sectionTitle}>Parents / Guardians</h3>
          <p className={`mt-1 ${typeRole.metadata}`}>
            People related to this player through family relationships.
          </p>
        </div>
        <button type="button" className={primaryButtonClass} onClick={openAddParentDrawer}>
          + Add Parent
        </button>
      </div>

      {rows === null ? (
        <p className={typeRole.metadata}>Loading family…</p>
      ) : loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-control border border-dashed border-border px-5 py-8">
          <p className={typeRole.metadata}>
            No parents or guardians are connected yet. Add a parent to keep family
            contacts on this player&apos;s record.
          </p>
          <button type="button" className={primaryButtonClass} onClick={openAddParentDrawer}>
            + Add Parent
          </button>
        </div>
      ) : (
        <div className="flex max-w-xl flex-col gap-3">
          {rows.map((row) => (
            <ParentRow key={row.relationship.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
