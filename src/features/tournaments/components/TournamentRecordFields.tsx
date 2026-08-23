"use client";

import { useId, type ReactNode } from "react";
import { CalendarDays, Flag, Link2, MapPin, NotebookPen, Plane } from "lucide-react";

import {
  WorkspaceAccentHeading,
  WorkspaceField,
  WorkspaceFieldGrid,
  WorkspaceMutedNote,
  WorkspaceReadOnlyValue,
  WorkspaceStack,
} from "@/components/adaptive-workspace";
import { moduleFieldClassCompact } from "@/components/module-theme";
import { EMPTY_VALUE, formatDate } from "@/lib/formatting";

import { cityStateFromLocation, optionsWithCurrent } from "../editor";
import { joinCityState, joinDistance, splitDistance } from "../location";
import {
  RECRUITING_PLAN_LABELS,
  RECRUITING_PLANS,
  TOURNAMENT_ENTRY_TYPE_OPTIONS,
  TOURNAMENT_LEVEL_OPTIONS,
  TOURNAMENT_LIFECYCLE_LABELS,
  TOURNAMENT_STATUS_LABELS,
  TOURNAMENT_STATUSES,
  TOURNAMENT_SURFACE_OPTIONS,
  type TournamentInput,
  type TournamentLifecycleStatus,
  type TournamentStatus,
  type RecruitingPlan,
} from "../types";

function textOrEmpty(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || EMPTY_VALUE;
}

function isBlank(value: string | null | undefined): boolean {
  return !value?.trim();
}

function attendedLabel(value: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return EMPTY_VALUE;
}

function Field({
  label,
  editing,
  empty,
  span,
  children,
}: {
  label: string;
  editing: boolean;
  empty: boolean;
  span?: boolean;
  children: ReactNode;
}) {
  if (!editing && empty) return null;
  return (
    <WorkspaceField label={label} span={span}>
      {children}
    </WorkspaceField>
  );
}

function EmptySection({ editing }: { editing: boolean }) {
  if (editing) return null;
  return <WorkspaceMutedNote>No data recorded.</WorkspaceMutedNote>;
}

export function TournamentOverviewFields({
  form,
  editing,
  onChange,
}: {
  form: TournamentInput;
  editing: boolean;
  onChange: (patch: Partial<TournamentInput>) => void;
}) {
  const ids = useId();
  const levelOptions = optionsWithCurrent(TOURNAMENT_LEVEL_OPTIONS, form.level);
  const entryOptions = optionsWithCurrent(TOURNAMENT_ENTRY_TYPE_OPTIONS, form.entryType);
  const surfaceOptions = optionsWithCurrent(TOURNAMENT_SURFACE_OPTIONS, form.surface);
  const empty =
    !editing &&
    isBlank(form.name) &&
    isBlank(form.level) &&
    isBlank(form.entryType) &&
    isBlank(form.lifecycleStatus) &&
    form.attended === null &&
    isBlank(form.surface);

  return (
    <section aria-label="Overview">
      <WorkspaceAccentHeading icon={Flag}>Overview</WorkspaceAccentHeading>
      {empty ? <EmptySection editing={editing} /> : null}
      <WorkspaceFieldGrid columns={3} className="mt-[5px]">
        <Field label="Tournament name" editing={editing} empty={isBlank(form.name)}>
          {editing ? (
            <input
              className={moduleFieldClassCompact}
              value={form.name}
              onChange={(event) => onChange({ name: event.target.value })}
              required
            />
          ) : (
            <WorkspaceReadOnlyValue value={form.name} />
          )}
        </Field>
        <Field label="Level" editing={editing} empty={isBlank(form.level)}>
          {editing ? (
            <>
              <input
                className={moduleFieldClassCompact}
                list={`${ids}-levels`}
                value={form.level ?? ""}
                onChange={(event) => onChange({ level: event.target.value || null })}
              />
              <datalist id={`${ids}-levels`}>
                {levelOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </>
          ) : (
            <WorkspaceReadOnlyValue value={textOrEmpty(form.level)} />
          )}
        </Field>
        <Field label="Open / Closed" editing={editing} empty={isBlank(form.entryType)}>
          {editing ? (
            <select
              className={moduleFieldClassCompact}
              value={form.entryType ?? ""}
              onChange={(event) => onChange({ entryType: event.target.value || null })}
            >
              <option value="">—</option>
              {entryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <WorkspaceReadOnlyValue value={textOrEmpty(form.entryType)} />
          )}
        </Field>
        <Field label="Surface" editing={editing} empty={isBlank(form.surface)}>
          {editing ? (
            <>
              <input
                className={moduleFieldClassCompact}
                list={`${ids}-surfaces`}
                value={form.surface ?? ""}
                onChange={(event) => onChange({ surface: event.target.value || null })}
              />
              <datalist id={`${ids}-surfaces`}>
                {surfaceOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </>
          ) : (
            <WorkspaceReadOnlyValue value={textOrEmpty(form.surface)} />
          )}
        </Field>
        <Field label="Tournament status" editing={editing} empty={isBlank(form.lifecycleStatus)}>
          {editing ? (
            <select
              className={moduleFieldClassCompact}
              value={form.lifecycleStatus ?? ""}
              onChange={(event) =>
                onChange({
                  lifecycleStatus: (event.target.value || null) as TournamentLifecycleStatus | null,
                })
              }
            >
              <option value="">—</option>
              {(Object.keys(TOURNAMENT_LIFECYCLE_LABELS) as TournamentLifecycleStatus[]).map((status) => (
                <option key={status} value={status}>
                  {TOURNAMENT_LIFECYCLE_LABELS[status]}
                </option>
              ))}
            </select>
          ) : (
            <WorkspaceReadOnlyValue
              value={form.lifecycleStatus ? TOURNAMENT_LIFECYCLE_LABELS[form.lifecycleStatus] : EMPTY_VALUE}
            />
          )}
        </Field>
        <Field label="Operational status" editing={editing} empty={false}>
          {editing ? (
            <select
              className={moduleFieldClassCompact}
              value={form.status}
              onChange={(event) => onChange({ status: event.target.value as TournamentStatus })}
            >
              {TOURNAMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TOURNAMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          ) : (
            <WorkspaceReadOnlyValue value={TOURNAMENT_STATUS_LABELS[form.status]} />
          )}
        </Field>
      </WorkspaceFieldGrid>
    </section>
  );
}

export function TournamentScheduleFields({
  form,
  editing,
  onChange,
}: {
  form: TournamentInput;
  editing: boolean;
  onChange: (patch: Partial<TournamentInput>) => void;
}) {
  const empty = !editing && isBlank(form.startDate) && isBlank(form.endDate);
  return (
    <section aria-label="Schedule">
      <WorkspaceAccentHeading icon={CalendarDays} tone="info">
        Schedule
      </WorkspaceAccentHeading>
      {empty ? <EmptySection editing={editing} /> : null}
      <WorkspaceFieldGrid columns={2} className="mt-[5px]">
        <Field label="Start date" editing={editing} empty={isBlank(form.startDate)}>
          {editing ? (
            <input
              type="date"
              className={moduleFieldClassCompact}
              value={form.startDate ?? ""}
              onChange={(event) => onChange({ startDate: event.target.value || null })}
            />
          ) : (
            <WorkspaceReadOnlyValue value={form.startDate ? formatDate(form.startDate) : EMPTY_VALUE} />
          )}
        </Field>
        <Field label="End date" editing={editing} empty={isBlank(form.endDate)}>
          {editing ? (
            <input
              type="date"
              className={moduleFieldClassCompact}
              value={form.endDate ?? ""}
              onChange={(event) => onChange({ endDate: event.target.value || null })}
            />
          ) : (
            <WorkspaceReadOnlyValue value={form.endDate ? formatDate(form.endDate) : EMPTY_VALUE} />
          )}
        </Field>
      </WorkspaceFieldGrid>
    </section>
  );
}

export function TournamentLocationFields({
  form,
  editing,
  onChange,
}: {
  form: TournamentInput;
  editing: boolean;
  onChange: (patch: Partial<TournamentInput>) => void;
}) {
  const { city, state } = cityStateFromLocation(form.location);
  const empty = !editing && isBlank(city) && isBlank(state) && isBlank(form.venue);
  return (
    <section aria-label="Location">
      <WorkspaceAccentHeading icon={MapPin} tone="success">
        Location
      </WorkspaceAccentHeading>
      {empty ? <EmptySection editing={editing} /> : null}
      <WorkspaceFieldGrid columns={3} className="mt-[5px]">
        <Field label="City" editing={editing} empty={isBlank(city)}>
          {editing ? (
            <input
              className={moduleFieldClassCompact}
              value={city}
              onChange={(event) => onChange({ location: joinCityState(event.target.value, state) })}
            />
          ) : (
            <WorkspaceReadOnlyValue value={textOrEmpty(city)} />
          )}
        </Field>
        <Field label="State" editing={editing} empty={isBlank(state)}>
          {editing ? (
            <input
              className={moduleFieldClassCompact}
              value={state}
              onChange={(event) => onChange({ location: joinCityState(city, event.target.value) })}
            />
          ) : (
            <WorkspaceReadOnlyValue value={textOrEmpty(state)} />
          )}
        </Field>
        <Field label="Venue" editing={editing} empty={isBlank(form.venue)}>
          {editing ? (
            <input
              className={moduleFieldClassCompact}
              value={form.venue ?? ""}
              onChange={(event) => onChange({ venue: event.target.value || null })}
            />
          ) : (
            <WorkspaceReadOnlyValue value={textOrEmpty(form.venue)} />
          )}
        </Field>
      </WorkspaceFieldGrid>
    </section>
  );
}

export function TournamentTravelFields({
  form,
  editing,
  onChange,
}: {
  form: TournamentInput;
  editing: boolean;
  onChange: (patch: Partial<TournamentInput>) => void;
}) {
  const distance = splitDistance(form.distanceFromColumbus);
  const empty =
    !editing && form.attended === null && isBlank(distance.miles) && isBlank(distance.extra);
  return (
    <section aria-label="Travel">
      <WorkspaceAccentHeading icon={Plane} tone="research">
        Travel
      </WorkspaceAccentHeading>
      {empty ? <EmptySection editing={editing} /> : null}
      <WorkspaceFieldGrid columns={3} className="mt-[5px]">
        <Field label="Attended" editing={editing} empty={form.attended === null}>
          {editing ? (
            <select
              className={moduleFieldClassCompact}
              value={form.attended === null ? "" : form.attended ? "yes" : "no"}
              onChange={(event) => {
                const value = event.target.value;
                onChange({ attended: value === "" ? null : value === "yes" });
              }}
            >
              <option value="">—</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          ) : (
            <WorkspaceReadOnlyValue value={attendedLabel(form.attended)} />
          )}
        </Field>
        <Field label="Recruiting plan" editing={editing} empty={false}>
          {editing ? (
            <select
              className={moduleFieldClassCompact}
              value={form.recruitingPlan}
              onChange={(event) => onChange({ recruitingPlan: event.target.value as RecruitingPlan })}
            >
              {RECRUITING_PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {RECRUITING_PLAN_LABELS[plan]}
                </option>
              ))}
            </select>
          ) : (
            <WorkspaceReadOnlyValue value={RECRUITING_PLAN_LABELS[form.recruitingPlan]} />
          )}
        </Field>
        <Field label="Distance from Columbus" editing={editing} empty={isBlank(distance.miles)}>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step="0.1"
                inputMode="decimal"
                className={moduleFieldClassCompact}
                value={distance.miles}
                onChange={(event) =>
                  onChange({ distanceFromColumbus: joinDistance(event.target.value, distance.extra) })
                }
              />
              <span className="shrink-0 text-xs text-text-secondary">mi</span>
            </div>
          ) : (
            <WorkspaceReadOnlyValue value={distance.miles ? `${distance.miles} mi` : EMPTY_VALUE} />
          )}
        </Field>
        <Field label="Drive time / distance notes" editing={editing} empty={isBlank(distance.extra)} span>
          {editing ? (
            <input
              className={moduleFieldClassCompact}
              value={distance.extra}
              onChange={(event) =>
                onChange({ distanceFromColumbus: joinDistance(distance.miles, event.target.value) })
              }
              placeholder="Drive time or other notes stored with distance"
            />
          ) : (
            <WorkspaceReadOnlyValue value={textOrEmpty(distance.extra)} />
          )}
        </Field>
      </WorkspaceFieldGrid>
    </section>
  );
}

export function TournamentLinksNotesFields({
  form,
  editing,
  onChange,
}: {
  form: TournamentInput;
  editing: boolean;
  onChange: (patch: Partial<TournamentInput>) => void;
}) {
  const empty =
    !editing && isBlank(form.websiteUrl) && isBlank(form.notes) && isBlank(form.additionalNotes);
  return (
    <section aria-label="Links and notes">
      <WorkspaceAccentHeading icon={NotebookPen} tone="knowledge">
        Links & Notes
      </WorkspaceAccentHeading>
      {empty ? <EmptySection editing={editing} /> : null}
      <WorkspaceFieldGrid columns={2} className="mt-[5px]">
        <Field label="Tournament page" editing={editing} empty={isBlank(form.websiteUrl)} span>
          {editing ? (
            <input
              type={form.websiteUrl && !/^https?:\/\//i.test(form.websiteUrl) ? "text" : "url"}
              inputMode="url"
              className={moduleFieldClassCompact}
              value={form.websiteUrl ?? ""}
              onChange={(event) => onChange({ websiteUrl: event.target.value || null })}
              placeholder="https://"
            />
          ) : form.websiteUrl ? (
            <a
              href={form.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--module-accent)] hover:underline"
            >
              {form.websiteUrl}
              <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </a>
          ) : (
            <WorkspaceReadOnlyValue value={EMPTY_VALUE} />
          )}
        </Field>
        <Field label="Notes / start times" editing={editing} empty={isBlank(form.notes)} span>
          {editing ? (
            <textarea
              className={`${moduleFieldClassCompact} min-h-24 resize-y`}
              value={form.notes ?? ""}
              onChange={(event) => onChange({ notes: event.target.value || null })}
            />
          ) : (
            <WorkspaceReadOnlyValue value={textOrEmpty(form.notes)} />
          )}
        </Field>
        <Field label="Additional notes" editing={editing} empty={isBlank(form.additionalNotes)} span>
          {editing ? (
            <textarea
              className={`${moduleFieldClassCompact} min-h-20 resize-y`}
              value={form.additionalNotes ?? ""}
              onChange={(event) => onChange({ additionalNotes: event.target.value || null })}
            />
          ) : (
            <WorkspaceReadOnlyValue value={textOrEmpty(form.additionalNotes)} />
          )}
        </Field>
      </WorkspaceFieldGrid>
    </section>
  );
}

export function TournamentImportedRecruitsField({
  form,
  editing,
  onChange,
}: {
  form: TournamentInput;
  editing: boolean;
  onChange: (patch: Partial<TournamentInput>) => void;
}) {
  return (
    <Field label="Recruits attending (imported)" editing={editing} empty={isBlank(form.recruitsAttendingText)} span>
      {editing ? (
        <textarea
          className={`${moduleFieldClassCompact} min-h-20 resize-y`}
          value={form.recruitsAttendingText ?? ""}
          onChange={(event) => onChange({ recruitsAttendingText: event.target.value || null })}
        />
      ) : (
        <WorkspaceReadOnlyValue value={textOrEmpty(form.recruitsAttendingText)} />
      )}
    </Field>
  );
}

/** Full stacked field set used by Add Tournament. */
export default function TournamentRecordFields({
  form,
  editing,
  onChange,
}: {
  form: TournamentInput;
  editing: boolean;
  onChange: (patch: Partial<TournamentInput>) => void;
}) {
  return (
    <WorkspaceStack>
      <TournamentOverviewFields form={form} editing={editing} onChange={onChange} />
      <TournamentScheduleFields form={form} editing={editing} onChange={onChange} />
      <TournamentLocationFields form={form} editing={editing} onChange={onChange} />
      <TournamentTravelFields form={form} editing={editing} onChange={onChange} />
      <TournamentLinksNotesFields form={form} editing={editing} onChange={onChange} />
      <section aria-label="Imported recruits">
        <WorkspaceAccentHeading icon={NotebookPen}>Imported recruits</WorkspaceAccentHeading>
        <WorkspaceFieldGrid columns={2} className="mt-[5px]">
          <TournamentImportedRecruitsField form={form} editing={editing} onChange={onChange} />
        </WorkspaceFieldGrid>
      </section>
    </WorkspaceStack>
  );
}
