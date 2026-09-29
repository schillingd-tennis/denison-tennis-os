"use client";

import { Award, BookOpen, Search, Shield, Sparkles, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import ModulePageShell from "@/components/ModulePageShell";
import ModuleSectionTabs from "@/components/ModuleSectionTabs";
import { KNOWLEDGE_ROUTE } from "@/lib/module-routes";
import styles from "./RecordBookWorkspace.module.css";

type TabId = "overview" | "team" | "players" | "coaching" | "opponents" | "honors" | "seasons" | "letterwinners";
type RecordBookPayload = { source: string; syncedAt: string; sections: Record<string, string> };
type ActiveStanding = { category: string; scope: string; rank: string; name: string; years: string; value: string };
type CoachSeason = { year: string; finish: string; record: string; rank: string };
type CoachRecord = { years: string; coach: string; seasons: number; wins: number; losses: number; percentage: number; note: string; history: CoachSeason[] };

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "team", label: "Team Records" },
  { id: "players", label: "Player Records" },
  { id: "coaching", label: "Coaching Records" },
  { id: "opponents", label: "Record vs. Opponents" },
  { id: "honors", label: "Honors/Awards" },
  { id: "seasons", label: "Season History" },
  { id: "letterwinners", label: "Letterwinners" },
] as const;

const sectionsByTab: Record<TabId, string[]> = {
  overview: [],
  team: ["team-records", "postseason", "ncaa"],
  players: ["career", "season"],
  coaching: ["coaches"],
  opponents: ["opponents"],
  honors: ["national", "awards", "all-ncac"],
  seasons: ["results"],
  letterwinners: ["letters"],
};

export default function RecordBookWorkspace() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<RecordBookPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/data/record-book.json")
      .then((response) => {
        if (!response.ok) throw new Error("The historical archive could not be loaded.");
        return response.json() as Promise<RecordBookPayload>;
      })
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "The historical archive could not be loaded."));
  }, []);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const needle = query.trim().toLocaleLowerCase();
    const candidates = root.querySelectorAll<HTMLElement>("[data-record-search-item], li, tbody tr:not(.bracket-detail), details");
    candidates.forEach((element) => {
      element.hidden = Boolean(needle) && !element.textContent?.toLocaleLowerCase().includes(needle);
      if (needle && !element.hidden && element.tagName === "DETAILS") element.setAttribute("open", "");
    });
  }, [activeTab, data, query]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const triggers = Array.from(root.querySelectorAll<HTMLElement>(".bracket-toggle"));
    const cleanups = triggers.map((trigger) => {
      const group = trigger.dataset.bracketGroup;
      const rows = group ? Array.from(root.querySelectorAll<HTMLElement>(`.bracket-detail[data-bracket-group="${group}"]`)) : [];
      const icon = trigger.querySelector<HTMLElement>(".bracket-toggle-icon");
      const setOpen = (open: boolean) => {
        trigger.classList.toggle("expanded", open);
        trigger.setAttribute("aria-expanded", String(open));
        rows.forEach((row) => { row.hidden = !open; });
        if (icon) icon.textContent = open ? "−" : "+";
      };
      const toggle = () => setOpen(trigger.getAttribute("aria-expanded") !== "true");
      const keydown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggle();
      };
      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      setOpen(false);
      trigger.addEventListener("click", toggle);
      trigger.addEventListener("keydown", keydown);
      return () => { trigger.removeEventListener("click", toggle); trigger.removeEventListener("keydown", keydown); };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [activeTab, data]);

  const html = useMemo(() => {
    if (!data) return "";
    return sectionsByTab[activeTab]
      .map((id) => `<section data-record-section="${id}">${data.sections[id] ?? ""}</section>`)
      .join("")
      .replace(
        /<span class="name">([\s\S]*?)<span class="years">([\s\S]*?)<\/span><\/span>/g,
        '<span class="name">$1</span><span class="years">$2</span>',
      );
  }, [activeTab, data]);

  const activeStandings = useMemo(() => data ? readActiveStandings(data) : [], [data]);
  const coachRecords = useMemo(() => data ? readCoachRecords(data.sections.coaches ?? "") : [], [data]);

  function changeTab(tab: TabId) {
    setActiveTab(tab);
    setQuery("");
  }

  return (
    <ModulePageShell title="Record Book" subtitle="The complete history of Denison men's tennis—records, honors, postseason results, opponents, seasons, and letterwinners.">
      <nav className="text-xs text-text-secondary" aria-label="Breadcrumb">
        <Link href={KNOWLEDGE_ROUTE} className="hover:text-text-primary">Resources</Link>
        <span className="mx-1.5">›</span>
        <span className="text-text-primary">Record Book</span>
      </nav>

      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-[0_10px_30px_rgba(17,24,39,0.05)]">
        <div className="grid gap-5 bg-gradient-to-br from-[#17171a] via-[#242126] to-[#5d111c] p-5 text-white md:grid-cols-[1fr_auto] md:p-7">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-orange-200 uppercase"><Sparkles className="h-3.5 w-3.5"/>Program history</div>
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">2025 NCAA Division III National Champions</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">74 seasons, 11 head coaches, and one continually growing Big Red record book.</p>
          </div>
          <div className="flex items-center md:justify-end"><div className="flex h-20 w-20 items-center justify-center rounded-full border border-orange-300/30 bg-orange-300/15"><Trophy className="h-9 w-9 text-orange-200"/></div></div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0">
          <Stat icon={Trophy} value="853" label="All-time wins" />
          <Stat icon={Shield} value=".731" label="Winning percentage" />
          <Stat icon={Award} value="20" label="NCAC championships" />
          <Stat icon={Users} value="31" label="ITA All-Americans" />
        </div>
      </section>

      <ModuleSectionTabs aria-label="Record Book sections" tabs={tabs} activeId={activeTab} onChange={changeTab} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <span className="sr-only">Search the current Record Book section</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tabs.find((tab) => tab.id === activeTab)?.label.toLocaleLowerCase()}…`} className="h-10 w-full rounded-control border border-border bg-surface pr-3 pl-9 text-sm text-text-primary outline-none focus:border-[var(--module-accent)]" />
        </label>
        <p className="text-xs text-text-secondary">Historical archive through 2025–26</p>
      </div>

      {error ? <div className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {!data && !error ? <div className="flex min-h-56 items-center justify-center rounded-card border border-border bg-surface text-sm text-text-secondary"><BookOpen className="mr-2 h-4 w-4 animate-pulse"/>Loading the archive…</div> : null}
      {data && activeTab === "overview" ? <div ref={contentRef}><OverviewDashboard standings={activeStandings} /></div> : null}
      {data && activeTab === "coaching" ? <CoachingRecords records={coachRecords} query={query} /> : null}
      {data && activeTab !== "overview" && activeTab !== "coaching" ? <div ref={contentRef} className={styles.archive} dangerouslySetInnerHTML={{ __html: html }} /> : null}
    </ModulePageShell>
  );
}

function readCoachRecords(html: string): CoachRecord[] {
  if (typeof DOMParser === "undefined") return [];
  const document = new DOMParser().parseFromString(html, "text/html");
  return Array.from(document.querySelectorAll<HTMLTableRowElement>("tr.bracket-toggle")).map((row) => {
    const cells = Array.from(row.cells);
    const group = row.dataset.bracketGroup;
    const history = group ? Array.from(document.querySelectorAll<HTMLTableRowElement>(`tr.bracket-detail[data-bracket-group="${group}"]`)).map((detail) => ({
      year: detail.querySelector(".yr-year")?.childNodes.item(0)?.textContent?.trim() ?? "—",
      finish: detail.querySelector(".yr-finish")?.textContent?.trim() ?? "—",
      record: detail.querySelector(".yr-record .yr-num")?.textContent?.trim() ?? "—",
      rank: detail.querySelector(".yr-rank .yr-num")?.textContent?.trim() ?? "—",
    })) : [];
    return {
      years: cells[0]?.textContent?.trim() ?? "—",
      coach: cells[1]?.textContent?.trim() ?? "—",
      seasons: Number.parseInt(cells[2]?.textContent ?? "0", 10) || 0,
      wins: Number.parseInt(cells[3]?.textContent ?? "0", 10) || 0,
      losses: Number.parseInt(cells[4]?.textContent ?? "0", 10) || 0,
      percentage: Number.parseFloat(cells[5]?.textContent ?? "0") || 0,
      note: cells[6]?.textContent?.replace("+", "").trim() ?? "—",
      history,
    };
  });
}

function CoachingRecords({ records, query }: { records: CoachRecord[]; query: string }) {
  type SortKey = Exclude<keyof CoachRecord, "history">;
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({ key: "years", ascending: false });
  const labels: Array<{ key: SortKey; label: string }> = [
    { key: "years", label: "Years" }, { key: "coach", label: "Coach" }, { key: "seasons", label: "Seasons" },
    { key: "wins", label: "W" }, { key: "losses", label: "L" }, { key: "percentage", label: "Pct." }, { key: "note", label: "Note" },
  ];
  const needle = query.trim().toLocaleLowerCase();
  const visible = records.filter((record) => !needle || [record.years, record.coach, record.note, ...record.history.flatMap((season) => Object.values(season))].join(" ").toLocaleLowerCase().includes(needle));
  const sorted = [...visible].sort((left, right) => {
    const a = sort.key === "years" ? Number.parseInt(left.years.match(/\d{4}/)?.[0] ?? "0", 10) : left[sort.key];
    const b = sort.key === "years" ? Number.parseInt(right.years.match(/\d{4}/)?.[0] ?? "0", 10) : right[sort.key];
    const comparison = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true });
    return sort.ascending ? comparison : -comparison;
  });
  const changeSort = (key: SortKey) => setSort((current) => ({ key, ascending: current.key === key ? !current.ascending : key === "coach" || key === "note" }));

  return <section className={styles.coachingPanel}>
    <div><h2 className="text-xl font-semibold text-text-primary">Coaching Records</h2><p className="mt-1 max-w-4xl text-sm leading-6 text-text-secondary">Career totals and season-by-season results for every Big Red head coach. Select a coach to view each season.</p></div>
    <div className={styles.coachTable}>
      <div className={styles.coachHeader}>{labels.map(({ key, label }) => <button key={key} type="button" onClick={() => changeSort(key)} aria-pressed={sort.key === key} className={styles.coachSort}>{label}<span>{sort.key === key ? (sort.ascending ? "↑" : "↓") : "↕"}</span></button>)}</div>
      <div className={styles.coachRows}>{sorted.map((record, index) => <details key={`${record.coach}-${record.years}-${index}`} className={styles.coachAccordion}>
        <summary className={styles.coachSummary}><span>{record.years}</span><strong>{record.coach}</strong><span>{record.seasons}</span><span>{record.wins}</span><span>{record.losses}</span><span>{record.percentage.toFixed(3).replace(/^0/, "")}</span><span>{record.note}</span></summary>
        <div className={styles.coachHistory}><div className={styles.coachSeasonHeader}><span>Season</span><span>Finish</span><span>Record</span><span>National rank</span></div>{record.history.map((season) => <div key={`${record.coach}-${season.year}`} className={styles.coachSeason}><strong>{season.year}</strong><span>{season.finish}</span><span>{season.record}</span><span>{season.rank}</span></div>)}</div>
      </details>)}</div>
    </div>
  </section>;
}

function readActiveStandings(data: RecordBookPayload): ActiveStanding[] {
  if (typeof DOMParser === "undefined") return [];
  return ([
    ["career", "Career"],
    ["season", "Single season"],
  ] as const).flatMap(([section, scope]) => {
    const document = new DOMParser().parseFromString(data.sections[section] ?? "", "text/html");
    return Array.from(document.querySelectorAll("details")).flatMap((details) => {
      const category = details.querySelector(".coll-title")?.textContent?.trim() ?? "Record";
      return Array.from(details.querySelectorAll<HTMLLIElement>("li.active")).map((row) => {
        const nameNode = row.querySelector(".name")?.cloneNode(true) as HTMLElement | undefined;
        nameNode?.querySelector(".years")?.remove();
        return {
          category,
          scope,
          rank: row.querySelector(".rank")?.textContent?.trim() ?? "—",
          name: nameNode?.textContent?.trim() ?? "—",
          years: row.querySelector(".years")?.textContent?.trim() ?? "—",
          value: row.querySelector(".val")?.textContent?.trim() ?? "—",
        };
      });
    });
  });
}

function OverviewDashboard({ standings }: { standings: ActiveStanding[] }) {
  const records = [
    { label: "All-time wins", value: "853", detail: "Program history" },
    { label: "All-time win percentage", value: ".731", detail: "853–314" },
    { label: "NCAC championships", value: "20", detail: "Regular season and tournament" },
    { label: "NCAA team championships", value: "1", detail: "2025 National Champions" },
    { label: "Most wins in a season", value: "28", detail: "2025" },
    { label: "Longest win streak", value: "25", detail: "2025–26" },
  ];

  return <div className="grid gap-4">
    <section>
      <div className="mb-3"><p className="text-xs font-semibold tracking-wide text-[var(--module-accent-text)] uppercase">Program benchmarks</p><h2 className="mt-1 text-xl font-semibold text-text-primary">Records at a glance</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{records.map((record) => <article key={record.label} data-record-search-item className="rounded-card border border-border bg-surface p-4 shadow-[0_6px_18px_rgba(17,24,39,0.035)]"><p className="text-xs font-semibold tracking-wide text-text-secondary uppercase">{record.label}</p><strong className="mt-2 block text-3xl font-semibold tabular-nums text-[var(--module-accent-text)]">{record.value}</strong><p className="mt-1 text-xs text-text-secondary">{record.detail}</p></article>)}</div>
    </section>
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-[0_6px_18px_rgba(17,24,39,0.035)]">
      <div className="border-b border-border px-4 py-3"><p className="text-xs font-semibold tracking-wide text-[var(--module-accent-text)] uppercase">Active Big Red</p><h2 className="mt-1 text-lg font-semibold text-text-primary">Current-player record standings</h2><p className="mt-1 text-xs text-text-secondary">Current players appearing in the program’s key career and single-season leaderboards.</p></div>
      {standings.length ? <div className="overflow-x-auto"><table className="w-full min-w-[44rem] border-collapse text-sm"><thead><tr className="bg-app-background text-left text-[11px] tracking-wide text-text-secondary uppercase"><th className="px-4 py-2.5">Player</th><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Scope</th><th className="px-4 py-2.5">Years</th><th className="px-4 py-2.5 text-right">Standing</th><th className="px-4 py-2.5 text-right">Total</th></tr></thead><tbody className="divide-y divide-border">{standings.map((standing, index) => <tr key={`${standing.scope}-${standing.category}-${standing.name}-${index}`} className="hover:bg-[var(--module-tint)]/30"><td className="px-4 py-3 font-semibold text-text-primary">{standing.name}</td><td className="px-4 py-3 text-text-primary">{standing.category}</td><td className="px-4 py-3 text-text-secondary">{standing.scope}</td><td className="px-4 py-3 text-text-secondary">{standing.years}</td><td className="px-4 py-3 text-right font-medium text-text-primary">{standing.rank}</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--module-accent-text)]">{standing.value}</td></tr>)}</tbody></table></div> : <p className="px-4 py-8 text-center text-sm text-text-secondary">No current players are listed in the active record standings.</p>}
    </section>
  </div>;
}

function Stat({ icon: Icon, value, label }: { icon: typeof Trophy; value: string; label: string }) {
  return <div className="flex items-center gap-3 p-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--module-tint)] text-[var(--module-accent-text)]"><Icon className="h-4 w-4"/></span><span><strong className="block text-xl font-semibold tabular-nums text-text-primary">{value}</strong><span className="text-xs text-text-secondary">{label}</span></span></div>;
}
