"use client";

import { Building2, ChevronDown, ChevronRight, MapPin, Pencil, Plus, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import EmptyState from "@/components/EmptyState";
import ModulePageShell from "@/components/ModulePageShell";
import SearchInput from "@/components/SearchInput";
import SortableColumnHeader from "@/components/data-table/SortableColumnHeader";
import { InlineEditCell, type InlineCommitReason } from "@/components/inline-edit";
import { useDrawerManager } from "@/components/workspace-drawer";
import { KNOWLEDGE_ROUTE } from "@/lib/module-routes";
import { saveHotelAction, updateHotelFieldAction } from "../actions";
import { filterHotels, sortHotels } from "../filtering";
import type { Hotel, HotelSortKey, SortDirection } from "../types";
import HotelBrandMark from "./HotelBrandMark";

const EMPTY_FILTERS = { chain: "", city: "", state: "", rating: "", teamFriendly: "" };
type EditableHotelField = "state" | "name" | "address" | "chain" | "city" | "rating" | "dogEntryRating" | "yearStayed" | "notes";

export default function HotelsWorkspace({ hotels, loadError }: { hotels: Hotel[]; loadError: string | null }) {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [items, setItems] = useState(hotels);
  const [editing, setEditing] = useState<{ id: string; field: EditableHotelField } | null>(null);
  const [fieldError, setFieldError] = useState<string>();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState<{ key: HotelSortKey; direction: SortDirection }>({ key: "name", direction: "asc" });
  const [collapsedStates, setCollapsedStates] = useState<Set<string>>(() => new Set(hotels.map((hotel) => hotel.state)));
  const options = useMemo(() => ({
    chains: unique(items.map((hotel) => hotel.chain)), cities: unique(items.map((hotel) => hotel.city)), states: unique(items.map((hotel) => hotel.state)),
    ratings: [...new Set(items.map((hotel) => hotel.rating).filter((value): value is number => value != null))].sort((a, b) => b - a),
  }), [items]);
  const rows = useMemo(() => sortHotels(filterHotels(items, { query, ...filters }), sort.key, sort.direction), [filters, items, query, sort]);
  const stateGroups = useMemo(() => {
    const grouped = new Map<string, Hotel[]>();
    for (const hotel of rows) grouped.set(hotel.state, [...(grouped.get(hotel.state) ?? []), hotel]);
    return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [rows]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  function updateSort(key: HotelSortKey) { setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" })); }
  function toggleState(state: string) { setCollapsedStates((current) => { const next = new Set(current); if (next.has(state)) next.delete(state); else next.add(state); return next; }); }
  async function commitField(hotel: Hotel, field: EditableHotelField, raw: string, reason: InlineCommitReason) {
    void reason;
    const previous = items;
    const parsed = field === "rating" || field === "dogEntryRating" ? (raw.trim() ? Number(raw) : null) : raw.trim();
    setFieldError(undefined);
    setItems((current) => current.map((item) => item.id === hotel.id ? { ...item, [field]: field === "state" ? String(parsed).toUpperCase() : parsed } : item));
    setEditing(null);
    const result = await updateHotelFieldAction(hotel.id, field, raw);
    if (!result.success) { setItems(previous); setFieldError(result.message); setEditing({ id: hotel.id, field }); }
  }
  function openHotel(hotel?: Hotel) {
    openDrawer({
      id: hotel ? `hotel-${hotel.id}` : "hotel-new", title: hotel ? hotel.name : "Add Hotel", subtitle: "Knowledge · Hotels", hideFooter: true,
      content: <HotelForm hotel={hotel} onCancel={closeDrawer} onSaved={() => { closeDrawer(); router.refresh(); }}/>,
    });
  }

  return <ModulePageShell title="Hotels" subtitle="A shared directory of team travel hotel experience." actions={<button type="button" onClick={() => openHotel()} className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-[var(--module-accent)] px-4 text-sm font-semibold text-white shadow-sm"><Plus className="h-4 w-4"/>Add Hotel</button>}>
    <nav className="text-xs text-text-secondary" aria-label="Breadcrumb"><Link href={KNOWLEDGE_ROUTE} className="hover:text-text-primary">Knowledge</Link><span className="mx-1.5">›</span><span className="text-text-primary">Hotels</span></nav>
    {loadError ? <p className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{loadError}</p> : null}
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
      <div className="flex flex-col gap-3 border-b border-teal-200/70 bg-gradient-to-r from-teal-50/80 via-surface to-amber-50/45 p-3 sm:p-4">
        <div className="grid gap-2 lg:grid-cols-[minmax(18rem,1fr)_repeat(4,minmax(8rem,auto))]"><SearchInput value={query} onChange={setQuery} placeholder="Search hotels, locations, addresses, or notes" aria-label="Search hotels"/>
          <Select label="Chain" value={filters.chain} options={options.chains} onChange={(chain) => setFilters((current) => ({ ...current, chain }))}/>
          <Select label="City" value={filters.city} options={options.cities} onChange={(city) => setFilters((current) => ({ ...current, city }))}/>
          <Select label="State" value={filters.state} options={options.states} onChange={(state) => setFilters((current) => ({ ...current, state }))}/>
          <Select label="Rating" value={filters.rating} options={options.ratings.map(String)} onChange={(rating) => setFilters((current) => ({ ...current, rating }))}/>
        </div>
        <div className="flex items-center justify-between text-xs text-text-secondary"><span>{rows.length} of {hotels.length} hotels{activeFilterCount ? ` · ${activeFilterCount} filters` : ""}</span>{query || activeFilterCount ? <button type="button" onClick={() => { setQuery(""); setFilters(EMPTY_FILTERS); }} className="font-semibold text-[var(--module-accent)] hover:underline">Clear filters</button> : null}</div>
      </div>
      {rows.length === 0 ? <div className="p-5"><EmptyState title="No hotels found" description="Try another search or clear the filters."/></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[70rem] table-fixed text-left"><thead className="bg-app-background"><tr className="border-b border-border">
          <Header label="State" field="state" sort={sort} update={updateSort} className="w-[5%] font-bold"/><Header label="Hotel" field="name" sort={sort} update={updateSort} className="w-[24%]"/><Header label="Chain" field="chain" sort={sort} update={updateSort} className="w-[9%]"/><Header label="City" field="city" sort={sort} update={updateSort} className="w-[10%]"/><Header label="Rating" field="rating" sort={sort} update={updateSort} className="w-[7%]"/><Header label="Dog Entry" field="dogEntryRating" sort={sort} update={updateSort} className="w-[8%]"/><th className="w-[9%] px-3 py-3 text-[10px] font-semibold tracking-wide text-text-secondary uppercase">Last stayed</th><th className="w-[22%] px-4 py-3 text-[10px] font-semibold tracking-wide text-text-secondary uppercase">Notes</th><th className="w-[6%] px-2 py-3 text-[10px] font-semibold tracking-wide text-text-secondary uppercase">Edit</th>
        </tr></thead>{stateGroups.map(([state, stateHotels]) => { const collapsed = collapsedStates.has(state); return <tbody key={state}><tr className="border-y border-teal-200/80 bg-gradient-to-r from-teal-100/90 via-teal-50 to-emerald-50/70 shadow-[inset_4px_0_0_var(--module-accent)]"><td colSpan={9} className="px-3 py-2"><button type="button" onClick={() => toggleState(state)} aria-expanded={!collapsed} className="flex w-full items-center gap-2 text-left"><span className="text-[var(--module-accent)]">{collapsed ? <ChevronRight className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}</span><strong className="text-xs tracking-[0.08em] text-teal-950">{state}</strong><span className="rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold text-white">{stateHotels.length} {stateHotels.length === 1 ? "hotel" : "hotels"}</span></button></td></tr>{!collapsed ? stateHotels.map((hotel) => <tr key={hotel.id} tabIndex={0} role="button" onClick={() => openHotel(hotel)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openHotel(hotel); } }} className="cursor-pointer border-b border-border/70 text-xs transition-colors hover:bg-[var(--module-tint)]/40 focus:bg-[var(--module-tint)]/50 focus:outline-none"><td className="px-2 py-3 font-bold"><HotelInlineCell hotel={hotel} field="state" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<strong>{hotel.state}</strong>}/></td><td className="px-4 py-3"><div className="flex min-w-0 items-center gap-3"><HotelBrandMark name={hotel.name}/><div className="min-w-0 flex-1"><HotelInlineCell hotel={hotel} field="name" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<p className="truncate text-sm font-semibold text-text-primary">{hotel.name}</p>}/><HotelInlineCell hotel={hotel} field="address" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<p className="mt-0.5 truncate text-[11px] text-text-secondary">{hotel.address || "No address provided"}</p>}/></div></div></td><td className="px-3 py-3"><HotelInlineCell hotel={hotel} field="chain" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField}/></td><td className="px-4 py-3"><HotelInlineCell hotel={hotel} field="city" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField}/></td><td className="px-3 py-3"><HotelInlineCell hotel={hotel} field="rating" type="number" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<Rating value={hotel.rating}/>}/></td><td className="px-3 py-3"><HotelInlineCell hotel={hotel} field="dogEntryRating" type="number" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<Rating value={hotel.dogEntryRating}/>}/></td><td className="px-3 py-3"><HotelInlineCell hotel={hotel} field="yearStayed" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField}/></td><td className="px-4 py-3"><HotelInlineCell hotel={hotel} field="notes" type="textarea" editing={editing} error={fieldError} setEditing={setEditing} commit={commitField} renderDisplay={<p className="line-clamp-2 text-[11px] leading-4 text-text-secondary">{hotel.notes || "Add notes"}</p>}/></td><td className="px-2 py-3"><button type="button" aria-label={`Edit ${hotel.name}`} title="Open edit panel" onClick={(event) => { event.stopPropagation(); openHotel(hotel); }} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-control border border-teal-200 bg-teal-50 px-2.5 text-[11px] font-semibold text-teal-800 transition-colors hover:border-teal-300 hover:bg-teal-100"><Pencil className="h-3.5 w-3.5"/>Edit</button></td></tr>) : null}</tbody>; })}</table></div>
        <div className="md:hidden">{stateGroups.map(([state, stateHotels]) => { const collapsed = collapsedStates.has(state); return <section key={state} className="border-b border-border"><button type="button" onClick={() => toggleState(state)} aria-expanded={!collapsed} className="flex w-full items-center gap-2 border-l-4 border-teal-700 bg-gradient-to-r from-teal-100 via-teal-50 to-emerald-50/70 px-3 py-3 text-left"><span className="text-[var(--module-accent)]">{collapsed ? <ChevronRight className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}</span><strong className="text-sm tracking-wide text-teal-950">{state}</strong><span className="rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold text-white">{stateHotels.length}</span></button>{!collapsed ? <div className="divide-y divide-border">{stateHotels.map((hotel) => <button key={hotel.id} type="button" onClick={() => openHotel(hotel)} className="grid w-full gap-2 px-4 py-3.5 text-left hover:bg-[var(--module-tint)]/40"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><HotelBrandMark name={hotel.name} size={40}/><div className="min-w-0"><p className="truncate font-semibold text-text-primary">{hotel.name}</p><p className="mt-1 flex items-center gap-1 text-xs text-text-secondary"><MapPin className="h-3 w-3"/>{hotel.city}, <strong>{hotel.state}</strong></p></div></div><Rating value={hotel.rating}/></div><div className="flex items-center justify-between text-[11px] text-text-secondary"><span>{hotel.chain || "Chain not set"}</span><span>{hotel.yearStayed || "Year not set"}</span></div></button>)}</div> : null}</section>; })}</div>
      </>}
    </section>
  </ModulePageShell>;
}

function HotelInlineCell({ hotel, field, type = "text", editing, error, setEditing, commit, renderDisplay }: {
  hotel: Hotel; field: EditableHotelField; type?: "text" | "number" | "textarea";
  editing: { id: string; field: EditableHotelField } | null; error?: string;
  setEditing: (value: { id: string; field: EditableHotelField } | null) => void;
  commit: (hotel: Hotel, field: EditableHotelField, raw: string, reason: InlineCommitReason) => Promise<void>;
  renderDisplay?: React.ReactNode;
}) {
  const active = editing?.id === hotel.id && editing.field === field;
  return <InlineEditCell label={fieldLabel(field)} value={String(hotel[field] ?? "")} type={type} step={type === "number" ? 1 : undefined} editOn="click" density="compact" emphasis="directory" editing={active} error={active ? error : undefined} renderDisplay={renderDisplay} onRequestEdit={() => { setEditing({ id: hotel.id, field }); }} onCancel={() => setEditing(null)} onCommit={(raw, reason) => commit(hotel, field, raw, reason)}/>;
}

function fieldLabel(field: EditableHotelField) {
  return ({ state: "State", name: "Hotel name", address: "Address", chain: "Chain", city: "City", rating: "Rating", dogEntryRating: "Dog entry rating", yearStayed: "Last stayed", notes: "Notes" } as const)[field];
}

function unique(values: string[]) { return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <select aria-label={`Filter by ${label.toLowerCase()}`} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-0 rounded-control border border-border/70 bg-surface px-3 text-[16px] font-medium text-text-primary outline-none focus:border-[var(--module-accent)] md:text-sm"><option value="">All {label === "City" ? "cities" : `${label.toLowerCase()}s`}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>; }
function Header({ label, field, sort, update, className }: { label: string; field: HotelSortKey; sort: { key: HotelSortKey; direction: SortDirection }; update: (key: HotelSortKey) => void; className?: string }) { return <SortableColumnHeader label={label} sortDirection={sort.key === field ? sort.direction : null} onSort={() => update(field)} className={className}/>; }
function Rating({ value }: { value: number | null }) { return value == null ? <span className="text-text-secondary">—</span> : <span className="inline-flex items-center gap-1 font-semibold tabular-nums"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500"/>{value}</span>; }

function HotelForm({ hotel, onCancel, onSaved }: { hotel?: Hotel; onCancel: () => void; onSaved: () => void }) {
  const [message, setMessage] = useState(""); const [pending, startTransition] = useTransition();
  function save(formData: FormData) { setMessage(""); startTransition(async () => { const result = await saveHotelAction(formData); if (!result.success) return setMessage(result.message); onSaved(); }); }
  return <form action={save} className="flex min-h-full flex-col">{hotel ? <input type="hidden" name="id" value={hotel.id}/> : null}<div className="grid flex-1 content-start gap-4 p-5">
    <div className="rounded-card border border-[var(--module-accent)]/15 bg-[var(--module-tint)]/30 p-4"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[var(--module-accent)]"/><p className="text-[10px] font-bold tracking-wider text-[var(--module-accent)] uppercase">Hotel record</p></div><p className="mt-1 text-sm text-text-secondary">Keep travel experience and planning notes in one place.</p></div>
    <Field label="Hotel name"><input name="name" required defaultValue={hotel?.name} className={inputClass}/></Field><Field label="Chain"><input name="chain" defaultValue={hotel?.chain} placeholder="Optional" className={inputClass}/></Field>
    <div className="grid grid-cols-[1fr_6rem] gap-3"><Field label="City"><input name="city" required defaultValue={hotel?.city} className={inputClass}/></Field><Field label="State"><input name="state" required maxLength={2} defaultValue={hotel?.state} className={inputClass}/></Field></div>
    <Field label="Address"><input name="address" defaultValue={hotel?.address} className={inputClass}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Rating (1–5)"><input name="rating" type="number" min="1" max="5" step="1" defaultValue={hotel?.rating ?? ""} className={inputClass}/></Field><Field label="Dog entry (1–5)"><input name="dogEntryRating" type="number" min="1" max="5" step="1" defaultValue={hotel?.dogEntryRating ?? ""} className={inputClass}/></Field></div>
    <div className="grid grid-cols-2 gap-3"><Field label="Price range"><input name="priceRange" defaultValue={hotel?.priceRange} placeholder="Optional" className={inputClass}/></Field><Field label="Year stayed"><input name="yearStayed" defaultValue={hotel?.yearStayed} className={inputClass}/></Field></div>
    <Field label="Team friendly"><select name="teamFriendly" defaultValue={hotel?.teamFriendly == null ? "" : String(hotel.teamFriendly)} className={inputClass}><option value="">Not assessed</option><option value="true">Yes</option><option value="false">No</option></select></Field>
    <Field label="Notes"><textarea name="notes" rows={6} defaultValue={hotel?.notes} className={inputClass}/></Field>{message ? <p className="rounded-control bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{message}</p> : null}
  </div><div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-surface p-4"><button type="button" onClick={onCancel} className="h-10 rounded-control border border-border px-4 text-sm font-semibold">Cancel</button><button disabled={pending} className="h-10 rounded-control bg-[var(--module-accent)] px-5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : hotel ? "Save Hotel" : "Add Hotel"}</button></div></form>;
}

const inputClass = "w-full rounded-control border border-border bg-surface px-3 py-2.5 text-[16px] outline-none focus:border-[var(--module-accent)] focus:ring-2 focus:ring-[var(--module-tint)] md:text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-semibold text-text-primary"><span>{label}</span>{children}</label>; }
