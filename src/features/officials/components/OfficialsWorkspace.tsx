"use client";

import { ClipboardList, Pencil, Plus, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import EmptyState from "@/components/EmptyState";
import ModulePageShell from "@/components/ModulePageShell";
import SearchInput from "@/components/SearchInput";
import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import { InlineEditCell, type InlineCommitReason } from "@/components/inline-edit";
import { DrawerField, useDrawerManager } from "@/components/workspace-drawer";
import { EMPTY_VALUE } from "@/lib/formatting";
import { KNOWLEDGE_ROUTE } from "@/lib/module-routes";
import { saveOfficialAction, updateOfficialFieldAction } from "../actions";
import { filterOfficials, locationOptions, sortOfficials } from "../filtering";
import { officialLocationLabel } from "../seedData";
import type { Official, OfficialFilters, OfficialQuickView, OfficialSortKey, SortDirection } from "../types";

const EMPTY_FILTERS: OfficialFilters = { query: "", ranking: "", location: "", areaAssignor: "", view: "all" };
type EditableOfficialField = "name" | "email" | "phone" | "city" | "state" | "rate" | "ranking" | "notes" | "assignorArea";

export default function OfficialsWorkspace({ officials, loadError }: { officials: Official[]; loadError: string | null }) {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [items, setItems] = useState(officials);
  const [editing, setEditing] = useState<{ id: string; field: EditableOfficialField } | null>(null);
  const [fieldError, setFieldError] = useState<string>();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState<{ key: OfficialSortKey; direction: SortDirection }>({ key: "name", direction: "asc" });

  const locations = useMemo(() => locationOptions(items), [items]);
  const rows = useMemo(() => sortOfficials(filterOfficials(items, filters), sort.key, sort.direction), [filters, items, sort]);
  const activeFilterCount = [filters.ranking, filters.location, filters.areaAssignor].filter(Boolean).length + (filters.view !== "all" ? 1 : 0);

  function updateSort(key: OfficialSortKey) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  }

  function applySavedOfficial(official: Official) {
    setItems((current) => {
      const exists = current.some((item) => item.id === official.id);
      if (!exists) return [...current, official];
      return current.map((item) => (item.id === official.id ? official : item));
    });
  }

  async function commitField(official: Official, field: EditableOfficialField, raw: string, reason: InlineCommitReason) {
    void reason;
    const previous = items;
    const parsed = field === "ranking" ? (raw.trim() ? Number(raw) : null) : raw.trim();
    setFieldError(undefined);
    setItems((current) => current.map((item) => (
      item.id === official.id
        ? { ...item, [field]: field === "state" ? String(parsed).toUpperCase() : parsed }
        : item
    )));
    setEditing(null);
    const result = await updateOfficialFieldAction(official.id, field, raw);
    if (!result.success) {
      setItems(previous);
      setFieldError(result.message);
      setEditing({ id: official.id, field });
    }
  }

  function openOfficial(official?: Official) {
    openDrawer({
      id: official ? `official-${official.id}` : "official-new",
      title: official ? official.name : "Add Official",
      subtitle: "Resources · Officials List",
      hideFooter: true,
      content: (
        <OfficialForm
          official={official}
          onCancel={closeDrawer}
          onSaved={(saved) => {
            applySavedOfficial(saved);
            closeDrawer();
            router.refresh();
          }}
        />
      ),
    });
  }

  function setView(view: OfficialQuickView) {
    setFilters((current) => ({ ...current, view }));
  }

  return (
    <ModulePageShell
      title="Officials List"
      subtitle="Rate, contact, and assign officials for matches and events."
      actions={
        <button type="button" onClick={() => openOfficial()} className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-[var(--module-accent)] px-4 text-sm font-semibold text-white shadow-sm">
          <Plus className="h-4 w-4" />Add Official
        </button>
      }
    >
      <nav className="text-xs text-text-secondary" aria-label="Breadcrumb">
        <Link href={KNOWLEDGE_ROUTE} className="hover:text-text-primary">Resources</Link>
        <span className="mx-1.5">›</span>
        <span className="text-text-primary">Officials List</span>
      </nav>
      {loadError ? <p className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{loadError}</p> : null}
      <section data-officials-workspace="" className="overflow-hidden rounded-card border border-border bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
        <div className="flex flex-col gap-3 border-b border-teal-200/70 bg-gradient-to-r from-teal-50/80 via-surface to-amber-50/45 p-3 sm:p-4">
          <div className="flex flex-wrap gap-2">
            <ViewChip label="All Officials" active={filters.view === "all"} onClick={() => setView("all")} />
            <ViewChip label="Top Rated" active={filters.view === "topRated"} onClick={() => setView("topRated")} />
            <ViewChip label="Area Assignors" active={filters.view === "areaAssignors"} onClick={() => setView("areaAssignors")} />
          </div>
          <div className="grid gap-2 lg:grid-cols-[minmax(18rem,1fr)_repeat(3,minmax(8rem,auto))]">
            <SearchInput
              value={filters.query}
              onChange={(query) => setFilters((current) => ({ ...current, query }))}
              placeholder="Search officials, locations, email, phone, or notes"
              aria-label="Search officials"
            />
            <Select
              label="Ranking"
              value={filters.ranking}
              allLabel="All rankings"
              options={[
                { value: "5", label: "5" },
                { value: "4", label: "4" },
                { value: "3", label: "3" },
                { value: "2", label: "2" },
                { value: "1", label: "1" },
                { value: "none", label: "Not ranked" },
              ]}
              onChange={(ranking) => setFilters((current) => ({ ...current, ranking }))}
            />
            <Select
              label="Location"
              value={filters.location}
              allLabel="All locations"
              options={locations.map((location) => ({ value: location, label: location }))}
              onChange={(location) => setFilters((current) => ({ ...current, location }))}
            />
            <Select
              label="Area Assignor"
              value={filters.areaAssignor}
              allLabel="All"
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              onChange={(areaAssignor) => setFilters((current) => ({ ...current, areaAssignor }))}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>{rows.length} of {items.length} officials{activeFilterCount ? ` · ${activeFilterCount} filters` : ""}</span>
            {filters.query || activeFilterCount ? (
              <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="font-semibold text-[var(--module-accent-text)] hover:underline">Clear filters</button>
            ) : null}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-5"><EmptyState title="No officials found" description="Try another search or clear the filters." /></div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[72rem] table-fixed text-left">
                <thead className="bg-app-background">
                  <tr className="border-b border-border">
                    <Header label="Official" field="name" sort={sort} update={updateSort} className="w-[16%]" />
                    <Header label="Email" field="email" sort={sort} update={updateSort} className="w-[16%]" />
                    <Header label="Phone" field="phone" sort={sort} update={updateSort} className="w-[11%]" />
                    <Header label="Location" field="city" sort={sort} update={updateSort} className="w-[10%]" />
                    <Header label="Rate" field="rate" sort={sort} update={updateSort} className="w-[10%]" />
                    <Header label="Ranking" field="ranking" sort={sort} update={updateSort} className="w-[7%]" />
                    <Header label="Area Assignor" field="isAreaAssignor" sort={sort} update={updateSort} className="w-[9%]" />
                    <Header label="Notes" field="notes" sort={sort} update={updateSort} className="w-[15%]" />
                    <th className="w-[6%] px-2 py-3 text-[10px] font-semibold tracking-wide text-text-secondary uppercase">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((official) => {
                    const location = officialLocationLabel(official.city, official.state) || EMPTY_VALUE;
                    return (
                      <tr
                        key={official.id}
                        tabIndex={0}
                        role="button"
                        onClick={() => openOfficial(official)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openOfficial(official);
                          }
                        }}
                        className="cursor-pointer border-b border-border/70 text-xs transition-colors hover:bg-[var(--module-tint)]/40 focus:bg-[var(--module-tint)]/50 focus:outline-none"
                      >
                        <td className="px-4 py-2.5">
                          <OfficialInlineCell official={official} field="name" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<p className="truncate text-sm font-semibold text-text-primary">{official.name}</p>} />
                        </td>
                        <td className="px-3 py-2.5">
                          <OfficialInlineCell official={official} field="email" type="email" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<p className="truncate">{official.email || EMPTY_VALUE}</p>} />
                        </td>
                        <td className="px-3 py-2.5">
                          <OfficialInlineCell official={official} field="phone" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<p className="truncate">{official.phone || EMPTY_VALUE}</p>} />
                        </td>
                        <td className="px-3 py-2.5">
                          <OfficialInlineCell official={official} field="city" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<p className="truncate">{location}</p>} />
                        </td>
                        <td className="px-3 py-2.5">
                          <OfficialInlineCell official={official} field="rate" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<p className="truncate">{official.rate || EMPTY_VALUE}</p>} />
                        </td>
                        <td className="px-3 py-2.5">
                          <OfficialInlineCell official={official} field="ranking" type="number" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<Ranking value={official.ranking} />} />
                        </td>
                        <td className="px-3 py-2.5 font-medium">{official.isAreaAssignor ? "Yes" : "No"}</td>
                        <td className="px-3 py-2.5">
                          <OfficialInlineCell official={official} field="notes" type="textarea" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<p className="line-clamp-2 text-[11px] leading-4 text-text-secondary">{official.notes || EMPTY_VALUE}</p>} />
                        </td>
                        <td className="px-2 py-2.5">
                          <button
                            type="button"
                            aria-label={`Edit ${official.name}`}
                            title="Open edit panel"
                            onClick={(event) => { event.stopPropagation(); openOfficial(official); }}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-control border border-teal-200 bg-teal-50 px-2.5 text-[11px] font-semibold text-teal-800 transition-colors hover:border-teal-300 hover:bg-teal-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {rows.map((official) => {
                const location = officialLocationLabel(official.city, official.state);
                return (
                  <button
                    key={official.id}
                    type="button"
                    onClick={() => openOfficial(official)}
                    className="grid min-h-11 w-full gap-1.5 px-4 py-3.5 text-left hover:bg-[var(--module-tint)]/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text-primary">{official.name}</p>
                        <p className="mt-1 truncate text-xs text-text-secondary">{location || "Location not set"}</p>
                      </div>
                      <Ranking value={official.ranking} />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[11px] text-text-secondary">
                      <span className="truncate">{official.email || official.phone || "No contact"}</span>
                      <span>{official.isAreaAssignor ? "Assignor" : official.rate || "Rate —"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>
    </ModulePageShell>
  );
}

function OfficialInlineCell({
  official, field, type = "text", editing, error, setEditing, commit, renderDisplay,
}: {
  official: Official;
  field: EditableOfficialField;
  type?: "text" | "number" | "textarea" | "email";
  editing: { id: string; field: EditableOfficialField } | null;
  error?: string;
  setEditing: (value: { id: string; field: EditableOfficialField } | null) => void;
  commit: (official: Official, field: EditableOfficialField, raw: string, reason: InlineCommitReason) => Promise<void>;
  renderDisplay?: React.ReactNode;
}) {
  const active = editing?.id === official.id && editing.field === field;
  const labels: Record<EditableOfficialField, string> = {
    name: "Official name", email: "Email", phone: "Phone", city: "City", state: "State",
    rate: "Rate", ranking: "Ranking", notes: "Notes", assignorArea: "Assignor area",
  };
  return (
    <InlineEditCell
      label={labels[field]}
      value={String(official[field] ?? "")}
      type={type}
      step={type === "number" ? 1 : undefined}
      editOn="click"
      density="compact"
      emphasis="directory"
      editing={active}
      error={active ? error : undefined}
      renderDisplay={renderDisplay}
      onRequestEdit={() => setEditing({ id: official.id, field })}
      onCancel={() => setEditing(null)}
      onCommit={(raw, reason) => commit(official, field, raw, reason)}
    />
  );
}

function ViewChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-control px-3 text-xs font-semibold transition-colors ${
        active
          ? "bg-[var(--module-accent)] text-white"
          : "border border-border bg-surface text-text-secondary hover:border-[var(--module-accent)]/40 hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function Select({
  label, value, options, onChange, allLabel,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  allLabel: string;
}) {
  return (
    <select
      aria-label={`Filter by ${label.toLowerCase()}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 min-w-0 rounded-control border border-border/70 bg-surface px-3 text-[16px] font-medium text-text-primary outline-none focus:border-[var(--module-accent)] md:text-sm"
    >
      <option value="">{allLabel}</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function Header({
  label, field, sort, update, className,
}: {
  label: string;
  field: OfficialSortKey;
  sort: { key: OfficialSortKey; direction: SortDirection };
  update: (key: OfficialSortKey) => void;
  className?: string;
}) {
  return <SortableColumnHeader label={label} sortDirection={sort.key === field ? sort.direction : null} onSort={() => update(field)} className={className} />;
}

function Ranking({ value }: { value: number | null }) {
  return value == null
    ? <span className="text-text-secondary">{EMPTY_VALUE}</span>
    : <span className="inline-flex items-center gap-1 font-semibold tabular-nums"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />{value}</span>;
}

function OfficialForm({ official, onCancel, onSaved }: { official?: Official; onCancel: () => void; onSaved: (official: Official) => void }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      const result = await saveOfficialAction(formData);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      onSaved(result.official);
    });
  }

  return (
    <form action={save} className="flex min-h-full flex-col">
      {official ? <input type="hidden" name="id" value={official.id} /> : null}
      <div className="grid flex-1 content-start gap-5 p-5">
        <div className="rounded-card border border-[var(--module-accent)]/15 bg-[var(--module-tint)]/30 p-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[var(--module-accent)]" />
            <p className="text-[10px] font-bold tracking-wider text-[var(--module-accent-text)] uppercase">Official record</p>
          </div>
          <p className="mt-1 text-sm text-text-secondary">Keep contact details, ranking, and assignment notes in one place.</p>
        </div>

        <Section title="Contact">
          <Field label="Name"><input name="name" required defaultValue={official?.name} className={inputClass} /></Field>
          <Field label="Email"><input name="email" type="email" defaultValue={official?.email} className={inputClass} /></Field>
          <Field label="Phone"><input name="phone" defaultValue={official?.phone} className={inputClass} /></Field>
          <Field label="Preferred contact">
            <select name="preferredContact" defaultValue={official?.preferredContact ?? ""} className={inputClass}>
              <option value="">No preference set</option>
              <option value="Email">Email</option>
              <option value="Phone">Phone</option>
              <option value="Text">Text</option>
              <option value="No preference">No preference</option>
            </select>
          </Field>
          <Field label="Address line 1"><input name="addressLine1" defaultValue={official?.addressLine1} className={inputClass} /></Field>
          <Field label="Address line 2"><input name="addressLine2" defaultValue={official?.addressLine2} className={inputClass} /></Field>
          <div className="grid grid-cols-[1fr_5rem_7rem] gap-3">
            <Field label="City"><input name="city" defaultValue={official?.city} className={inputClass} /></Field>
            <Field label="State"><input name="state" maxLength={2} defaultValue={official?.state} className={inputClass} /></Field>
            <Field label="Postal"><input name="postalCode" defaultValue={official?.postalCode} className={inputClass} /></Field>
          </div>
        </Section>

        <Section title="Officiating">
          <Field label="Rate"><input name="rate" defaultValue={official?.rate} className={inputClass} /></Field>
          <Field label="Ranking (1–5)"><input name="ranking" type="number" min="1" max="5" step="1" defaultValue={official?.ranking ?? ""} className={inputClass} /></Field>
          <Field label="Area assignor">
            <select name="isAreaAssignor" defaultValue={String(official?.isAreaAssignor ?? false)} className={inputClass}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </Field>
          <Field label="Assignor area / org"><input name="assignorArea" defaultValue={official?.assignorArea} className={inputClass} /></Field>
        </Section>

        <Section title="Notes">
          <Field label="Notes"><textarea name="notes" rows={6} defaultValue={official?.notes} className={inputClass} /></Field>
        </Section>

        {message ? <p className="rounded-control bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{message}</p> : null}
      </div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-surface p-4">
        <button type="button" onClick={onCancel} className="h-10 rounded-control border border-border px-4 text-sm font-semibold">Cancel</button>
        <button type="submit" disabled={pending} className="h-10 rounded-control bg-[var(--module-accent)] px-5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : official ? "Save Official" : "Add Official"}
        </button>
      </div>
    </form>
  );
}

const inputClass = "w-full rounded-control border border-border bg-surface px-3 py-2.5 text-[16px] outline-none focus:border-[var(--module-accent)] focus:ring-2 focus:ring-[var(--module-tint)] md:text-sm";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <p className="text-[10px] font-bold tracking-wider text-text-secondary uppercase">{title}</p>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <DrawerField label={label}>{children}</DrawerField>;
}
