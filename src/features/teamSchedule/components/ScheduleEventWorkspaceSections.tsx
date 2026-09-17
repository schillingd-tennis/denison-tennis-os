"use client";
import { packingGroup } from "../defaultPackingList";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  CheckSquare,
  GraduationCap,
  MapPin,
  NotebookPen,
  Plane,
  Plus,
  Trash2,
  Users,
  UsersRound,
} from "lucide-react";

import {
  WorkspaceAccentHeading,
  WorkspaceFieldGrid,
} from "@/components/adaptive-workspace";
import PlayerAvatar from "@/components/PlayerAvatar";
import SearchInput from "@/components/SearchInput";
import { modulePrimaryButtonClass } from "@/components/module-theme";
import { formatDate } from "@/lib/formatting";

import {
  addEventTeamAction,
  addTravelingPartyMembersAction,
  deleteAlumniAttendeeAction,
  deleteEventSessionAction,
  deletePackingItemAction,
  deleteTravelArrangementAction,
  removeEventTeamAction,
  removeTravelingPartyMemberAction,
  saveAlumniAttendeeAction,
  saveEventSessionAction,
  savePackingItemAction,
  savePlanningNotesAction,
  saveTravelArrangementAction,
} from "../eventPlanningActions";
import {
  ALUMNI_RSVP_LABELS,
  ALUMNI_RSVP_STATUSES,
  PARTY_MEMBER_KIND_LABELS,
  SESSION_TYPE_LABELS,
  SESSION_TYPES,
  TRAVEL_MODE_LABELS,
  TRAVEL_MODES,
  type ScheduleAlumniAttendee,
  type ScheduleEventSession,
  type ScheduleEventTeam,
  type SchedulePackingItem,
  type SchedulePartyMember,
  type ScheduleRosterCandidate,
  type ScheduleTravelArrangement,
  type SessionType,
  type TravelMode,
} from "../eventPlanningTypes";
import {
  genericScheduleIdentity,
  resolveScheduleIdentityFromLabel,
  resolveSchoolIdentityFromLabelExact,
} from "../schoolIdentity";
import { ScheduleEventField } from "./ScheduleEventFieldSession";
import ScheduleIdentityMark from "./ScheduleIdentityMark";

const GRID_3 = "mt-[5px]";
const GRID_2 = "mt-[5px]";
const inputClass =
  "h-9 w-full rounded-control border border-border bg-surface px-2.5 text-sm text-text-primary";
const selectClass = inputClass;
const textareaClass =
  "min-h-[5rem] w-full rounded-control border border-border bg-surface px-2.5 py-2 text-sm text-text-primary";
const secondaryBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-xs font-semibold text-text-primary hover:bg-app-background";
const dangerBtn =
  "inline-flex h-8 items-center gap-1 rounded-control px-2 text-xs font-medium text-red-700 hover:bg-red-50";

export function EventDetailsWorkspace() {
  return (
    <div className="min-w-0 space-y-[10px]">
      <section aria-label="Identity">
        <WorkspaceAccentHeading icon={MapPin}>Event</WorkspaceAccentHeading>
        <WorkspaceFieldGrid columns={3} className={GRID_3}>
          <ScheduleEventField field="opponentName" label="Opponent" />
          <ScheduleEventField field="eventName" label="Event name" />
          <ScheduleEventField field="eventType" label="Event type" />
          <ScheduleEventField field="status" label="Status" />
          <ScheduleEventField field="siteDesignation" label="Home / Away / Neutral" />
          <ScheduleEventField field="seasonSegment" label="Season segment" />
          <ScheduleEventField field="itaRank" label="ITA rank" />
          <ScheduleEventField field="doubleheaderStatus" label="Doubleheader" />
          <ScheduleEventField field="officialsNeeded" label="Officials needed" />
        </WorkspaceFieldGrid>
      </section>
      <div className="border-t border-border/50 pt-[10px]">
        <section aria-label="Dates and venue">
          <WorkspaceAccentHeading icon={CalendarDays} tone="info">
            Dates & Venue
          </WorkspaceAccentHeading>
          <WorkspaceFieldGrid columns={3} className={GRID_3}>
            <ScheduleEventField field="startDate" label="Start date" />
            <ScheduleEventField field="endDate" label="End date" />
            <ScheduleEventField field="timeText" label="Primary time" />
            <ScheduleEventField field="venueName" label="Venue" />
            <ScheduleEventField field="city" label="City" />
            <ScheduleEventField field="state" label="State" />
            <ScheduleEventField field="locationText" label="Location display" span />
            <ScheduleEventField field="travelRequired" label="Travel required" />
            <ScheduleEventField field="ncac" label="NCAC" />
            <ScheduleEventField field="countsAsCompetitionDate" label="Counts as competition date" />
            <ScheduleEventField field="competitionDateNumber" label="Competition date #" />
          </WorkspaceFieldGrid>
        </section>
      </div>
      <div className="border-t border-border/50 pt-[10px]">
        <section aria-label="General notes">
          <WorkspaceAccentHeading icon={NotebookPen} tone="warning">
            General notes
          </WorkspaceAccentHeading>
          <WorkspaceFieldGrid columns={2} className={GRID_2}>
            <ScheduleEventField field="notes" label="Schedule notes" span />
          </WorkspaceFieldGrid>
        </section>
      </div>
    </div>
  );
}

export function TravelingPartyWorkspace({
  eventId,
  party,
  roster,
  onPartyChange,
  runSave,
}: {
  eventId: string;
  party: SchedulePartyMember[];
  roster: ScheduleRosterCandidate[];
  onPartyChange: (party: SchedulePartyMember[]) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const linked = useMemo(() => new Set(party.map((m) => m.personId)), [party]);

  const available = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return roster.filter((row) => {
      if (linked.has(row.id)) return false;
      if (!needle) return true;
      return [row.displayName, row.secondary, row.classYear]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [roster, linked, query]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function addSelected() {
    if (selected.length === 0) return;
    setError(null);
    startTransition(async () => {
      const byKind = new Map<string, string[]>();
      for (const id of selected) {
        const candidate = roster.find((row) => row.id === id);
        const kind = candidate?.kind ?? "player";
        const list = byKind.get(kind) ?? [];
        list.push(id);
        byKind.set(kind, list);
      }
      await runSave(async () => {
        let next = party;
        for (const [kind, ids] of byKind) {
          const result = await addTravelingPartyMembersAction(
            eventId,
            ids,
            kind as SchedulePartyMember["memberKind"],
          );
          if (!result.success) {
            setError(result.error);
            throw new Error(result.error);
          }
          next = result.data;
        }
        onPartyChange(next);
        setSelected([]);
      });
    });
  }

  function removeMember(personId: string) {
    setError(null);
    startTransition(async () => {
      await runSave(async () => {
        const result = await removeTravelingPartyMemberAction(eventId, personId);
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onPartyChange(result.data);
      });
    });
  }

  return (
    <div className="min-w-0 space-y-4">
      <section aria-label="Selected traveling party">
        <WorkspaceAccentHeading icon={Users} tone="warning">
          Selected ({party.length})
        </WorkspaceAccentHeading>
        {party.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">No travelers selected yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border/40 rounded-card border border-border">
            {party.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-3 py-2">
                <PlayerAvatar photoUrl={member.photoUrl} initials={member.initials} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {member.displayName}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {PARTY_MEMBER_KIND_LABELS[member.memberKind]}
                    {member.classYear != null ? ` · ${member.classYear}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  className={dangerBtn}
                  disabled={pending}
                  onClick={() => removeMember(member.personId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Add from roster">
        <WorkspaceAccentHeading icon={Plus} tone="module">
          Add from roster
        </WorkspaceAccentHeading>
        <div className="mt-2 space-y-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search players and coaches"
            aria-label="Search roster"
          />
          <ul className="max-h-[22rem] divide-y divide-border overflow-y-auto rounded-card border border-border">
            {available.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-text-secondary">
                No matching people available.
              </li>
            ) : (
              available.map((row) => (
                <li key={row.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-app-background">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() => toggle(row.id)}
                      className="h-4 w-4 rounded border-border accent-[var(--module-accent)]"
                    />
                    <PlayerAvatar photoUrl={row.photoUrl} initials={row.initials} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-primary">
                        {row.displayName}
                      </span>
                      <span className="block truncate text-xs text-text-secondary">
                        {row.secondary}
                      </span>
                    </span>
                  </label>
                </li>
              ))
            )}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={modulePrimaryButtonClass}
              disabled={pending || selected.length === 0}
              onClick={addSelected}
            >
              Add {selected.length > 0 ? selected.length : ""} selected
            </button>
            <span className="text-xs text-text-secondary">{selected.length} selected</span>
          </div>
        </div>
      </section>
      {error ? (
        <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TeamsInvolvedWorkspace({
  eventId,
  teams,
  onTeamsChange,
  runSave,
}: {
  eventId: string;
  teams: ScheduleEventTeam[];
  onTeamsChange: (teams: ScheduleEventTeam[]) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addTeam() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      await runSave(async () => {
        const result = await addEventTeamAction(eventId, trimmed);
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onTeamsChange(result.data);
        setName("");
      });
    });
  }

  function removeTeam(teamId: string) {
    setError(null);
    startTransition(async () => {
      await runSave(async () => {
        const result = await removeEventTeamAction(eventId, teamId);
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onTeamsChange(result.data);
      });
    });
  }

  return (
    <div className="min-w-0 space-y-4">
      <section aria-label="Teams">
        <WorkspaceAccentHeading icon={UsersRound} tone="info">
          Teams ({teams.length})
        </WorkspaceAccentHeading>
        {teams.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">
            No teams listed yet. Add schools by name — logos resolve when recognized.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border/40 rounded-card border border-border">
            {teams.map((team) => {
              const identity =
                resolveSchoolIdentityFromLabelExact(team.teamName) ??
                resolveScheduleIdentityFromLabel(team.teamName) ??
                genericScheduleIdentity(team.teamName);
              return (
                <li key={team.id} className="flex items-center gap-3 px-3 py-2">
                  <ScheduleIdentityMark identity={identity} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                    {team.teamName}
                  </span>
                  <button
                    type="button"
                    className={dangerBtn}
                    disabled={pending}
                    onClick={() => removeTeam(team.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[14rem] flex-1 text-xs font-medium text-text-secondary">
          Team name
          <input
            className={`${inputClass} mt-1`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kenyon"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTeam();
              }
            }}
          />
        </label>
        <button type="button" className={modulePrimaryButtonClass} disabled={pending || !name.trim()} onClick={addTeam}>
          <Plus className="h-4 w-4" />
          Add team
        </button>
      </div>
      {error ? (
        <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function emptyTravel(mode: TravelMode = "van"): ScheduleTravelArrangement {
  return {
    id: "",
    eventId: "",
    travelMode: mode,
    label: null,
    departureDate: null,
    departureTime: null,
    departureTimezone: null,
    returnDate: null,
    returnTime: null,
    returnTimezone: null,
    origin: null,
    destination: null,
    provider: null,
    confirmation: null,
    notes: null,
    vehicleName: null,
    driverPersonId: null,
    airline: null,
    flightNumber: null,
    departureAirport: null,
    arrivalAirport: null,
    sortOrder: 0,
    passengerPersonIds: [],
  };
}

export function EventTravelWorkspace({
  eventId,
  travel,
  party,
  onTravelChange,
  runSave,
}: {
  eventId: string;
  travel: ScheduleTravelArrangement[];
  party: SchedulePartyMember[];
  onTravelChange: (travel: ScheduleTravelArrangement[]) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<ScheduleTravelArrangement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startCreate(mode: TravelMode = "van") {
    setDraft(emptyTravel(mode));
    setError(null);
  }

  function startEdit(row: ScheduleTravelArrangement) {
    setDraft({ ...row });
    setError(null);
  }

  function saveDraft() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      await runSave(async () => {
        const result = await saveTravelArrangementAction(eventId, draft.id || null, {
          travelMode: draft.travelMode,
          label: draft.label,
          departureDate: draft.departureDate,
          departureTime: draft.departureTime,
          departureTimezone: draft.departureTimezone,
          returnDate: draft.returnDate,
          returnTime: draft.returnTime,
          returnTimezone: draft.returnTimezone,
          origin: draft.origin,
          destination: draft.destination,
          provider: draft.provider,
          confirmation: draft.confirmation,
          notes: draft.notes,
          vehicleName: draft.vehicleName,
          driverPersonId: draft.driverPersonId,
          airline: draft.airline,
          flightNumber: draft.flightNumber,
          departureAirport: draft.departureAirport,
          arrivalAirport: draft.arrivalAirport,
          sortOrder: draft.sortOrder,
          passengerPersonIds: draft.passengerPersonIds,
        });
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onTravelChange(result.data);
        setDraft(null);
      });
    });
  }

  function removeTravel(id: string) {
    setError(null);
    startTransition(async () => {
      await runSave(async () => {
        const result = await deleteTravelArrangementAction(eventId, id);
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onTravelChange(result.data);
      });
    });
  }

  function togglePassenger(personId: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      passengerPersonIds: draft.passengerPersonIds.includes(personId)
        ? draft.passengerPersonIds.filter((id) => id !== personId)
        : [...draft.passengerPersonIds, personId],
    });
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <WorkspaceAccentHeading icon={Plane} tone="research">
          Travel arrangements ({travel.length})
        </WorkspaceAccentHeading>
        <button type="button" className={secondaryBtn} onClick={() => startCreate("van")}>
          <Plus className="h-3.5 w-3.5" />
          Add arrangement
        </button>
      </div>

      {travel.length === 0 && !draft ? (
        <p className="text-sm text-text-secondary">No travel arrangements yet.</p>
      ) : (
        <ul className="space-y-2">
          {travel.map((row) => (
            <li key={row.id} className="rounded-card border border-border px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {TRAVEL_MODE_LABELS[row.travelMode]}
                    {row.label ? ` · ${row.label}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {[
                      row.departureDate ? formatDate(row.departureDate) : null,
                      row.origin,
                      row.destination,
                      row.provider,
                      row.airline && row.flightNumber
                        ? `${row.airline} ${row.flightNumber}`
                        : row.airline,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Details incomplete"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button type="button" className={secondaryBtn} onClick={() => startEdit(row)}>
                    Edit
                  </button>
                  <button type="button" className={dangerBtn} disabled={pending} onClick={() => removeTravel(row.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <div className="space-y-3 rounded-card border border-border bg-app-background/40 p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium text-text-secondary">
              Mode
              <select
                className={`${selectClass} mt-1`}
                value={draft.travelMode}
                onChange={(e) => setDraft({ ...draft, travelMode: e.target.value as TravelMode })}
              >
                {TRAVEL_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {TRAVEL_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Label
              <input
                className={`${inputClass} mt-1`}
                value={draft.label ?? ""}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Provider
              <input
                className={`${inputClass} mt-1`}
                value={draft.provider ?? ""}
                onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Departure date
              <input
                type="date"
                className={`${inputClass} mt-1`}
                value={draft.departureDate ?? ""}
                onChange={(e) => setDraft({ ...draft, departureDate: e.target.value || null })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Departure time
              <input
                className={`${inputClass} mt-1`}
                value={draft.departureTime ?? ""}
                onChange={(e) => setDraft({ ...draft, departureTime: e.target.value })}
                placeholder="10:00 AM"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Departure TZ
              <input
                className={`${inputClass} mt-1`}
                value={draft.departureTimezone ?? ""}
                onChange={(e) => setDraft({ ...draft, departureTimezone: e.target.value })}
                placeholder="America/New_York"
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Return date
              <input
                type="date"
                className={`${inputClass} mt-1`}
                value={draft.returnDate ?? ""}
                onChange={(e) => setDraft({ ...draft, returnDate: e.target.value || null })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Return time
              <input
                className={`${inputClass} mt-1`}
                value={draft.returnTime ?? ""}
                onChange={(e) => setDraft({ ...draft, returnTime: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Return TZ
              <input
                className={`${inputClass} mt-1`}
                value={draft.returnTimezone ?? ""}
                onChange={(e) => setDraft({ ...draft, returnTimezone: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Origin
              <input
                className={`${inputClass} mt-1`}
                value={draft.origin ?? ""}
                onChange={(e) => setDraft({ ...draft, origin: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Destination
              <input
                className={`${inputClass} mt-1`}
                value={draft.destination ?? ""}
                onChange={(e) => setDraft({ ...draft, destination: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Confirmation
              <input
                className={`${inputClass} mt-1`}
                value={draft.confirmation ?? ""}
                onChange={(e) => setDraft({ ...draft, confirmation: e.target.value })}
              />
            </label>
            {draft.travelMode === "van" ? (
              <>
                <label className="text-xs font-medium text-text-secondary">
                  Vehicle
                  <input
                    className={`${inputClass} mt-1`}
                    value={draft.vehicleName ?? ""}
                    onChange={(e) => setDraft({ ...draft, vehicleName: e.target.value })}
                  />
                </label>
                <label className="text-xs font-medium text-text-secondary">
                  Driver
                  <select
                    className={`${selectClass} mt-1`}
                    value={draft.driverPersonId ?? ""}
                    onChange={(e) => setDraft({ ...draft, driverPersonId: e.target.value || null })}
                  >
                    <option value="">—</option>
                    {party.map((member) => (
                      <option key={member.personId} value={member.personId}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
            {draft.travelMode === "flight" ? (
              <>
                <label className="text-xs font-medium text-text-secondary">
                  Airline
                  <input
                    className={`${inputClass} mt-1`}
                    value={draft.airline ?? ""}
                    onChange={(e) => setDraft({ ...draft, airline: e.target.value })}
                  />
                </label>
                <label className="text-xs font-medium text-text-secondary">
                  Flight #
                  <input
                    className={`${inputClass} mt-1`}
                    value={draft.flightNumber ?? ""}
                    onChange={(e) => setDraft({ ...draft, flightNumber: e.target.value })}
                  />
                </label>
                <label className="text-xs font-medium text-text-secondary">
                  Departure airport
                  <input
                    className={`${inputClass} mt-1`}
                    value={draft.departureAirport ?? ""}
                    onChange={(e) => setDraft({ ...draft, departureAirport: e.target.value })}
                  />
                </label>
                <label className="text-xs font-medium text-text-secondary">
                  Arrival airport
                  <input
                    className={`${inputClass} mt-1`}
                    value={draft.arrivalAirport ?? ""}
                    onChange={(e) => setDraft({ ...draft, arrivalAirport: e.target.value })}
                  />
                </label>
              </>
            ) : null}
          </div>
          {(draft.travelMode === "van" || draft.travelMode === "bus") && party.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-text-secondary">Passengers from traveling party</p>
              <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-control border border-border bg-surface p-2">
                {party.map((member) => (
                  <li key={member.personId}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.passengerPersonIds.includes(member.personId)}
                        onChange={() => togglePassenger(member.personId)}
                      />
                      {member.displayName}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <label className="block text-xs font-medium text-text-secondary">
            Notes
            <textarea
              className={`${textareaClass} mt-1`}
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={modulePrimaryButtonClass} disabled={pending} onClick={saveDraft}>
              Save arrangement
            </button>
            <button type="button" className={secondaryBtn} onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PracticeMatchTimesWorkspace({
  eventId,
  sessions,
  primaryTime,
  onSessionsChange,
  runSave,
}: {
  eventId: string;
  sessions: ScheduleEventSession[];
  primaryTime: string | null;
  onSessionsChange: (sessions: ScheduleEventSession[]) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Partial<ScheduleEventSession> & { id?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveDraft() {
    if (!draft?.sessionDate) {
      setError("Session date is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await runSave(async () => {
        const result = await saveEventSessionAction(eventId, draft.id ?? null, {
          sessionType: (draft.sessionType as SessionType) ?? "match",
          sessionDate: draft.sessionDate!,
          startTime: draft.startTime ?? null,
          endTime: draft.endTime ?? null,
          venueOrCourt: draft.venueOrCourt ?? null,
          notes: draft.notes ?? null,
          sortOrder: draft.sortOrder ?? 0,
        });
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onSessionsChange(result.data);
        setDraft(null);
      });
    });
  }

  function removeSession(id: string) {
    startTransition(async () => {
      await runSave(async () => {
        const result = await deleteEventSessionAction(eventId, id);
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onSessionsChange(result.data);
      });
    });
  }

  return (
    <div className="min-w-0 space-y-4">
      {primaryTime ? (
        <p className="rounded-control border border-border/70 bg-app-background/50 px-3 py-2 text-xs text-text-secondary">
          Primary schedule time (Event Details): <span className="font-medium text-text-primary">{primaryTime}</span>
          . Session times below do not overwrite it.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <WorkspaceAccentHeading icon={CalendarDays} tone="success">
          Sessions ({sessions.length})
        </WorkspaceAccentHeading>
        <button
          type="button"
          className={secondaryBtn}
          onClick={() =>
            setDraft({
              sessionType: "match",
              sessionDate: "",
              startTime: "",
              endTime: "",
              venueOrCourt: "",
              notes: "",
              sortOrder: sessions.length,
            })
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Add session
        </button>
      </div>
      {sessions.length === 0 && !draft ? (
        <p className="text-sm text-text-secondary">No practice or match sessions yet.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-start justify-between gap-2 rounded-card border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {SESSION_TYPE_LABELS[session.sessionType]} · {formatDate(session.sessionDate)}
                </p>
                <p className="text-xs text-text-secondary">
                  {[session.startTime, session.endTime ? `– ${session.endTime}` : null, session.venueOrCourt]
                    .filter(Boolean)
                    .join(" ") || "Times TBD"}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" className={secondaryBtn} onClick={() => setDraft(session)}>
                  Edit
                </button>
                <button type="button" className={dangerBtn} disabled={pending} onClick={() => removeSession(session.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {draft ? (
        <div className="space-y-3 rounded-card border border-border bg-app-background/40 p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium text-text-secondary">
              Type
              <select
                className={`${selectClass} mt-1`}
                value={draft.sessionType ?? "match"}
                onChange={(e) => setDraft({ ...draft, sessionType: e.target.value as SessionType })}
              >
                {SESSION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {SESSION_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Date
              <input
                type="date"
                className={`${inputClass} mt-1`}
                value={draft.sessionDate ?? ""}
                onChange={(e) => setDraft({ ...draft, sessionDate: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Start
              <input
                className={`${inputClass} mt-1`}
                value={draft.startTime ?? ""}
                onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              End
              <input
                className={`${inputClass} mt-1`}
                value={draft.endTime ?? ""}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary sm:col-span-2">
              Venue / court
              <input
                className={`${inputClass} mt-1`}
                value={draft.venueOrCourt ?? ""}
                onChange={(e) => setDraft({ ...draft, venueOrCourt: e.target.value })}
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-text-secondary">
            Notes
            <textarea
              className={`${textareaClass} mt-1`}
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
          <div className="flex gap-2">
            <button type="button" className={modulePrimaryButtonClass} disabled={pending} onClick={saveDraft}>
              Save session
            </button>
            <button type="button" className={secondaryBtn} onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AlumniAttendingWorkspace({
  eventId,
  alumni,
  alumniCandidates,
  onAlumniChange,
  runSave,
}: {
  eventId: string;
  alumni: ScheduleAlumniAttendee[];
  alumniCandidates: ScheduleRosterCandidate[];
  onAlumniChange: (alumni: ScheduleAlumniAttendee[]) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const [personId, setPersonId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [classYear, setClassYear] = useState("");
  const [rsvp, setRsvp] = useState<(typeof ALUMNI_RSVP_STATUSES)[number]>("invited");
  const [guestCount, setGuestCount] = useState("0");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addAttendee() {
    setError(null);
    startTransition(async () => {
      await runSave(async () => {
        const result = await saveAlumniAttendeeAction(eventId, null, {
          personId: personId || null,
          guestName: guestName || null,
          classYear: classYear ? Number(classYear) : null,
          rsvpStatus: rsvp,
          guestCount: Number(guestCount) || 0,
          notes: notes || null,
        });
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onAlumniChange(result.data);
        setPersonId("");
        setGuestName("");
        setClassYear("");
        setRsvp("invited");
        setGuestCount("0");
        setNotes("");
      });
    });
  }

  function removeAttendee(id: string) {
    startTransition(async () => {
      await runSave(async () => {
        const result = await deleteAlumniAttendeeAction(eventId, id);
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onAlumniChange(result.data);
      });
    });
  }

  return (
    <div className="min-w-0 space-y-4">
      <WorkspaceAccentHeading icon={GraduationCap} tone="knowledge">
        Alumni & guests ({alumni.length})
      </WorkspaceAccentHeading>
      {alumni.length === 0 ? (
        <p className="text-sm text-text-secondary">No alumni or guests listed.</p>
      ) : (
        <ul className="divide-y divide-border/40 rounded-card border border-border">
          {alumni.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-text-primary">{row.displayName}</p>
                <p className="text-xs text-text-secondary">
                  {[
                    ALUMNI_RSVP_LABELS[row.rsvpStatus],
                    row.classYear != null ? `Class of ${row.classYear}` : null,
                    row.guestCount > 0 ? `${row.guestCount} guests` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button type="button" className={dangerBtn} disabled={pending} onClick={() => removeAttendee(row.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-medium text-text-secondary sm:col-span-2">
          Existing person
          <select className={`${selectClass} mt-1`} value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">— Manual guest —</option>
            {alumniCandidates.map((row) => (
              <option key={row.id} value={row.id}>
                {row.displayName}
                {row.classYear != null ? ` (${row.classYear})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-text-secondary">
          Guest name
          <input className={`${inputClass} mt-1`} value={guestName} onChange={(e) => setGuestName(e.target.value)} disabled={Boolean(personId)} />
        </label>
        <label className="text-xs font-medium text-text-secondary">
          Class year
          <input className={`${inputClass} mt-1`} value={classYear} onChange={(e) => setClassYear(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-text-secondary">
          RSVP
          <select className={`${selectClass} mt-1`} value={rsvp} onChange={(e) => setRsvp(e.target.value as typeof rsvp)}>
            {ALUMNI_RSVP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ALUMNI_RSVP_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-text-secondary">
          Guest count
          <input className={`${inputClass} mt-1`} value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-text-secondary sm:col-span-2 lg:col-span-3">
          Notes
          <input className={`${inputClass} mt-1`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      <button type="button" className={modulePrimaryButtonClass} disabled={pending} onClick={addAttendee}>
        <Plus className="h-4 w-4" />
        Add attendee
      </button>
      {error ? (
        <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PackingListWorkspace({
  eventId,
  packing,
  onPackingChange,
  runSave,
}: {
  eventId: string;
  packing: SchedulePackingItem[];
  onPackingChange: (packing: SchedulePackingItem[]) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [responsible, setResponsible] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const done = packing.filter((item) => item.isChecked).length;

  function addItem() {
    setError(null);
    startTransition(async () => {
      await runSave(async () => {
        const result = await savePackingItemAction(eventId, null, {
          itemName,
          quantity: Number(quantity) || 1,
          responsible: responsible || null,
          sortOrder: packing.length,
        });
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onPackingChange(result.data);
        setItemName("");
        setQuantity("1");
        setResponsible("");
      });
    });
  }

  function toggleChecked(item: SchedulePackingItem) {
    startTransition(async () => {
      await runSave(async () => {
        const result = await savePackingItemAction(eventId, item.id.startsWith("default:") ? null : item.id, {
          itemName: item.itemName,
          quantity: item.quantity,
          responsible: item.responsible,
          notes: item.notes,
          isChecked: !item.isChecked,
          isStarter: item.isStarter,
          sortOrder: item.sortOrder,
        });
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onPackingChange(result.data);
      });
    });
  }

  function removeItem(id: string) {
    startTransition(async () => {
      await runSave(async () => {
        const result = await deletePackingItemAction(eventId, id);
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onPackingChange(result.data);
      });
    });
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <WorkspaceAccentHeading icon={CheckSquare} tone="operations">
          Packing list ({done}/{packing.length})
        </WorkspaceAccentHeading>
      </div>
      {done > 0 && done < packing.length ? <p className="text-sm text-amber-800" role="status">Yellow = still to pack.</p> : null}
      {["School", "Home", "Van", "Additional items"].map((group) => {
        const items = packing.filter((item) => packingGroup(item.itemName) === group);
        if (!items.length) return null;
        return <fieldset key={group} className="min-w-0">
          <legend className="mb-1 text-xs font-semibold text-text-primary">{group}</legend>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-px overflow-hidden rounded-control border border-border bg-border/40">
            {items.map((item) => <li key={item.id} className={`flex items-center gap-2 px-2 ${done > 0 && !item.isChecked ? "bg-amber-100 text-amber-950" : "bg-surface"}`}>
              <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={item.isChecked} disabled={pending} onChange={() => toggleChecked(item)} className="h-4 w-4 shrink-0 accent-[var(--module-accent)]" aria-label={`Mark ${item.itemName} packed`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${item.isChecked ? "text-text-secondary line-through" : ""}`}>{item.itemName}{item.quantity > 1 ? ` ×${item.quantity}` : ""}</span>
                  {item.responsible ? <span className="text-xs">{item.responsible}</span> : null}
                </span>
              </label>
              {group === "Additional items" ? <button type="button" className={dangerBtn} disabled={pending} onClick={() => removeItem(item.id)} aria-label={`Remove ${item.itemName}`}><Trash2 className="h-3.5 w-3.5" /></button> : null}
            </li>)}
          </ul>
        </fieldset>;
      })}
      <details className="rounded-control border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-text-secondary">Add an extra item</summary>
        <div className="mt-2 space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-medium text-text-secondary sm:col-span-1">
          Item
          <input className={`${inputClass} mt-1`} value={itemName} onChange={(e) => setItemName(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-text-secondary">
          Qty
          <input className={`${inputClass} mt-1`} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-text-secondary">
          Responsible
          <input className={`${inputClass} mt-1`} value={responsible} onChange={(e) => setResponsible(e.target.value)} />
        </label>
      </div>
      <button type="button" className={modulePrimaryButtonClass} disabled={pending || !itemName.trim()} onClick={addItem}>
        <Plus className="h-4 w-4" />
        Add item
      </button>
        </div>
      </details>
      {error ? (
        <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PlanningNotesWorkspace({
  eventId,
  notes,
  onNotesChange,
  runSave,
}: {
  eventId: string;
  notes: string | null;
  onNotesChange: (notes: string | null, updatedAt: string | null) => void;
  runSave: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const [value, setValue] = useState(notes ?? "");
  const [syncedNotes, setSyncedNotes] = useState(notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if ((notes ?? "") !== syncedNotes) {
    setSyncedNotes(notes ?? "");
    setValue(notes ?? "");
  }

  function save() {
    setError(null);
    startTransition(async () => {
      await runSave(async () => {
        const result = await savePlanningNotesAction(eventId, value);
        if (!result.success) {
          setError(result.error);
          throw new Error(result.error);
        }
        onNotesChange(result.data.notes, result.data.updatedAt);
        setValue(result.data.notes ?? "");
        setSyncedNotes(result.data.notes ?? "");
      });
    });
  }

  return (
    <div className="min-w-0 space-y-3">
      <WorkspaceAccentHeading icon={NotebookPen}>
        Planning notes
      </WorkspaceAccentHeading>
      <p className="text-xs text-text-secondary">
        Separate from general Schedule notes. Edits persist across section switches after save.
      </p>
      <textarea
        className={`${textareaClass} min-h-[14rem]`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Working plans, hotel holds, coordination notes…"
        aria-label="Planning notes"
      />
      <button type="button" className={modulePrimaryButtonClass} disabled={pending} onClick={save}>
        Save planning notes
      </button>
      {error ? (
        <p role="alert" className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
