"use client";

import { ChevronDown, Library, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import EmptyState from "@/components/EmptyState";
import SearchInput from "@/components/SearchInput";
import { FilterMenuOption, FilterTrigger } from "@/components/toolbar";
import { useDrawerManager } from "@/components/workspace-drawer";
import { updatePracticeDrillAction } from "../actions";
import type { PracticeDrill } from "../types";

export default function DrillLibrary({ drills }: { drills: PracticeDrill[] }) {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [skill, setSkill] = useState("All");
  const [openFilter, setOpenFilter] = useState<"category" | "skill" | null>(null);
  const categories = useMemo(() => ["All", ...new Set(drills.map((d) => d.category || "Uncategorized"))], [drills]);
  const skills = useMemo(() => ["All", ...new Set(drills.flatMap((drill) => drill.tags).filter(Boolean).sort())], [drills]);
  const filtered = useMemo(() => drills.filter((d) => {
    const text = [d.name, d.description, d.sourceTags, d.category, d.notes].join(" ").toLowerCase();
    return (category === "All" || (d.category || "Uncategorized") === category) && (skill === "All" || d.tags.includes(skill)) && text.includes(query.trim().toLowerCase());
  }), [category, drills, query, skill]);
  const skillCount = new Set(drills.flatMap((drill) => drill.tags)).size;

  function editDrill(drill: PracticeDrill) {
    openDrawer({
      id: `practice-drill-${drill.id}`,
      title: "Edit Drill",
      subtitle: "Team Operations · Practice",
      hideFooter: true,
      content: <DrillEditForm drill={drill} onCancel={closeDrawer} onSaved={() => { closeDrawer(); router.refresh(); }}/>,
    });
  }

  return <section className="overflow-hidden rounded-card border border-border bg-surface shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
    <div style={heroStyle}>
      <div><p className="text-[11px] font-bold tracking-[0.14em] text-[var(--module-accent)] uppercase">Practice workspace</p><h2 className="mt-1 text-xl font-bold text-text-primary">Build better sessions</h2><p className="mt-1 max-w-xl text-sm text-text-secondary">Find a drill by skill or category, then select any card to review and edit it.</p></div>
      <div style={statsStyle}><Stat icon={Library} value={drills.length} label="Total drills"/><Stat icon={Target} value={categories.length - 1} label="Categories"/><Stat icon={Sparkles} value={skillCount} label="Skill types"/></div>
    </div>
    <div className="border-y border-border bg-surface px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1"><SearchInput value={query} onChange={setQuery} placeholder="Search drills by name, type, or description" aria-label="Search drills"/></div>
        <div className="flex shrink-0 gap-2">
          <div className="relative"><FilterTrigger icon={SlidersHorizontal} active={category !== "All"} label={category === "All" ? "Category" : category} count={category === "All" ? undefined : 1} trailing={<ChevronDown className="h-3.5 w-3.5"/>} onClick={() => setOpenFilter((open) => open === "category" ? null : "category")} aria-expanded={openFilter === "category"}/>
            {openFilter === "category" ? <div className="absolute top-12 right-0 z-20 w-52 rounded-card border border-border bg-surface p-1.5 shadow-xl" role="listbox" aria-label="Drill category">{categories.map((value) => <FilterMenuOption key={value} selected={category === value} onClick={() => { setCategory(value); setOpenFilter(null); }}>{value}</FilterMenuOption>)}</div> : null}
          </div>
          <div className="relative"><FilterTrigger active={skill !== "All"} label={skill === "All" ? "Type / Skill" : skill} count={skill === "All" ? undefined : 1} trailing={<ChevronDown className="h-3.5 w-3.5"/>} onClick={() => setOpenFilter((open) => open === "skill" ? null : "skill")} aria-expanded={openFilter === "skill"}/>
            {openFilter === "skill" ? <div className="absolute top-12 right-0 z-20 max-h-80 w-56 overflow-y-auto rounded-card border border-border bg-surface p-1.5 shadow-xl" role="listbox" aria-label="Drill type or skill">{skills.map((value) => <FilterMenuOption key={value} selected={skill === value} onClick={() => { setSkill(value); setOpenFilter(null); }}>{value}</FilterMenuOption>)}</div> : null}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between px-0.5 text-xs text-text-secondary"><span>{filtered.length} {filtered.length === 1 ? "result" : "results"}</span>{category !== "All" || skill !== "All" || query ? <button type="button" onClick={() => { setCategory("All"); setSkill("All"); setQuery(""); }} className="font-semibold text-[var(--module-accent)] hover:underline">Clear filters</button> : null}</div>
    </div>
    {filtered.length === 0 ? <div className="p-5"><EmptyState title="No drills found" description="Try another search or clear the category filter."/></div> : <div className="bg-app-background/55 p-3 sm:p-4"><div style={gridStyle}>{filtered.map((drill) => <button key={drill.id} type="button" onClick={() => editDrill(drill)} className="group" style={cardStyle} aria-label={`Edit ${drill.name}`}>
      <div style={cardAccentStyle}/><div className="flex items-center justify-between gap-2"><span style={categoryStyle}>{drill.category || "Uncategorized"}</span>{drill.frequency ? <span className="text-[10px] font-bold text-text-secondary">FREQ. {drill.frequency}</span> : null}</div>
      <h3 className="mt-3 text-[15px] font-bold leading-5 text-text-primary">{drill.name}</h3><p className="mt-1.5 line-clamp-2 min-h-10 text-xs leading-5 text-text-secondary">{drill.description || "No description provided."}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">{drill.tags.length ? drill.tags.map((tag, index) => <span key={`${tag}-${index}`} style={skillStyle}>{tag}</span>) : <span style={emptySkillStyle}>No skill type</span>}</div><span className="mt-3 block text-[10px] font-bold tracking-wide text-[var(--module-accent)] uppercase">Open drill →</span>
    </button>)}</div></div>}
  </section>;
}

function Stat({ icon: Icon, value, label }: { icon: typeof Library; value: number; label: string }) { return <div style={statStyle}><Icon className="h-4 w-4 shrink-0 text-[var(--module-accent)]"/><div><strong className="block text-[15px] leading-none text-text-primary">{value}</strong><span className="mt-1 block whitespace-nowrap text-[9px] font-bold tracking-wide text-text-secondary uppercase">{label}</span></div></div>; }

function DrillEditForm({ drill, onCancel, onSaved }: { drill: PracticeDrill; onCancel: () => void; onSaved: () => void }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function save(formData: FormData) { setMessage(""); startTransition(async () => { const result = await updatePracticeDrillAction(formData); if (!result.success) return setMessage(result.message); onSaved(); }); }
  return <form action={save} className="flex min-h-full flex-col"><input type="hidden" name="id" value={drill.id}/><div className="grid flex-1 content-start gap-4 p-5">
    <div className="rounded-card border border-[var(--module-accent)]/15 bg-[var(--module-tint)]/25 p-4"><p className="text-[10px] font-bold tracking-wider text-[var(--module-accent)] uppercase">Editing drill</p><p className="mt-1 text-sm font-semibold text-text-primary">Changes update this drill everywhere it is used.</p></div>
    <Field label="Drill name"><input name="name" required defaultValue={drill.name} className={inputClass}/></Field><Field label="Description"><textarea name="description" rows={4} defaultValue={drill.description} className={inputClass}/></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Category"><input name="category" defaultValue={drill.category} placeholder="Drills or Games" className={inputClass}/></Field><Field label="Frequency"><input name="frequency" defaultValue={drill.frequency} className={inputClass}/></Field></div>
    <Field label="Type / skills"><input name="tags" defaultValue={drill.tags.join(", ")} placeholder="Serve, Forehand, Volley" className={inputClass}/><span className="text-[10px] font-normal text-text-secondary">Separate multiple types with commas.</span></Field><Field label="Coaching notes"><textarea name="notes" rows={4} defaultValue={drill.notes} className={inputClass}/></Field>
    {message ? <p className="rounded-control bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{message}</p> : null}</div>
    <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-surface p-4"><button type="button" onClick={onCancel} className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-semibold hover:bg-app-background">Cancel</button><button disabled={pending} className="h-10 rounded-control bg-[var(--module-accent)] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60">{pending ? "Saving…" : "Save Drill"}</button></div>
  </form>;
}

const inputClass = "w-full rounded-control border border-border bg-surface px-3 py-2.5 text-[16px] outline-none focus:border-[var(--module-accent)] focus:ring-2 focus:ring-[var(--module-tint)] md:text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-bold text-text-primary"><span>{label}</span>{children}</label>; }

const heroStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", alignItems: "center", gap: 18, padding: 20, background: "linear-gradient(115deg, #ffffff 0%, #f8f5ff 52%, #fff1f3 100%)" };
const statsStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 };
const statStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 9, minWidth: 0, padding: "10px 12px", border: "1px solid rgba(200,16,46,.12)", borderRadius: 10, background: "rgba(255,255,255,.86)" };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 310px), 1fr))", gap: 12 };
const cardStyle: React.CSSProperties = { position: "relative", overflow: "hidden", minHeight: 184, padding: 16, border: "1px solid #e2e5ea", borderRadius: 12, background: "#fff", textAlign: "left", boxShadow: "0 2px 7px rgba(17,24,39,.05)", cursor: "pointer" };
const cardAccentStyle: React.CSSProperties = { position: "absolute", inset: "0 auto 0 0", width: 4, background: "linear-gradient(#c8102e, #7c3aed)", opacity: .85 };
const categoryStyle: React.CSSProperties = { borderRadius: 999, padding: "5px 9px", background: "#f3e8ff", color: "#6b21a8", fontSize: 10, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase" };
const skillStyle: React.CSSProperties = { border: "1px solid #bfdbfe", borderRadius: 6, padding: "4px 8px", background: "#eff6ff", color: "#1e40af", fontSize: 10, fontWeight: 700 };
const emptySkillStyle: React.CSSProperties = { borderRadius: 6, padding: "4px 8px", background: "#f1f5f9", color: "#64748b", fontSize: 10, fontWeight: 650 };
