"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readSheet } from "read-excel-file/browser";

import { modulePrimaryButtonClassSm } from "@/components/module-theme";
import type { Person } from "@/features/people/types";
import { getDisplayName } from "@/features/people/utils";

import { saveAcademicGradesAction } from "../actions";
import { parseGradeSpreadsheet, type SpreadsheetGradePreview } from "../spreadsheetImport";
import type { AcademicSeason } from "../types";

type Draft = { creditHours: string; semesterGpa: string; midtermGpa: string };

export default function GradeEntryDialog({ people, onClose }: { people: Person[]; onClose: () => void }) {
  const router = useRouter();
  const now = new Date();
  const [season, setSeason] = useState<AcademicSeason>(now.getMonth() < 6 ? "spring" : "fall");
  const [year, setYear] = useState(now.getFullYear());
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [mode, setMode] = useState<"spreadsheet" | "manual">("spreadsheet");
  const [preview, setPreview] = useState<SpreadsheetGradePreview | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function update(personId: string, field: keyof Draft, value: string) {
    setDrafts((current) => ({ ...current, [personId]: { ...current[personId], creditHours: current[personId]?.creditHours ?? "", semesterGpa: current[personId]?.semesterGpa ?? "", midtermGpa: current[personId]?.midtermGpa ?? "", [field]: value } }));
  }

  async function inspectSpreadsheet(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error("Choose an Excel .xlsx file.");
      const sheetRows = await readSheet(file);
      const next = parseGradeSpreadsheet(sheetRows, people);
      setSeason(next.season);
      setYear(next.calendarYear);
      setPreview(next);
      setFileName(file.name);
      setDrafts(Object.fromEntries(next.rows.filter((row) => row.personId && !row.issue).map((row) => [row.personId!, { creditHours: String(row.creditHours), semesterGpa: String(row.semesterGpa), midtermGpa: row.midtermGpa == null ? "" : String(row.midtermGpa) }])));
    } catch (cause) {
      setPreview(null);
      setFileName(null);
      setError(cause instanceof Error ? cause.message : "Could not read the spreadsheet.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const rows = people.flatMap((person) => {
      const draft = drafts[person.id];
      if (!draft || (!draft.creditHours && !draft.semesterGpa && !draft.midtermGpa)) return [];
      if (!draft.creditHours || !draft.semesterGpa) return [];
      return [{ personId: person.id, creditHours: Number(draft.creditHours), semesterGpa: Number(draft.semesterGpa), midtermGpa: draft.midtermGpa ? Number(draft.midtermGpa) : null }];
    });
    if (!rows.length) {
      setError("Enter hours and semester GPA for at least one player.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await saveAcademicGradesAction({ season, calendarYear: year, rows });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="grade-entry-title" className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-card border border-border bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id="grade-entry-title" className="text-lg font-semibold">Add / Update Semester Grades</h2>
            <p className="text-xs text-text-secondary">Only attempted hours, semester GPA, and midterm GPA are stored.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="text-xl text-text-secondary">×</button>
        </div>
        <div className="flex gap-1 border-b border-border bg-app-background/50 px-5 pt-3">
          <button type="button" onClick={() => setMode("spreadsheet")} className={`rounded-t-control px-4 py-2 text-sm font-semibold ${mode === "spreadsheet" ? "bg-surface text-[var(--module-accent)]" : "text-text-secondary"}`}>Spreadsheet Upload</button>
          <button type="button" onClick={() => setMode("manual")} className={`rounded-t-control px-4 py-2 text-sm font-semibold ${mode === "manual" ? "bg-surface text-[var(--module-accent)]" : "text-text-secondary"}`}>Manual Entry</button>
        </div>
        <div className="flex flex-wrap gap-3 border-b border-border bg-app-background/50 px-5 py-3">
          <label className="text-xs font-medium">Semester
            <select value={season} onChange={(event) => setSeason(event.target.value as AcademicSeason)} className="ml-2 h-9 rounded-control border border-border bg-surface px-2 text-sm">
              <option value="fall">Fall</option><option value="spring">Spring</option>
            </select>
          </label>
          <label className="text-xs font-medium">Year
            <input type="number" min="2000" max="2200" value={year} onChange={(event) => setYear(Number(event.target.value))} className="ml-2 h-9 w-24 rounded-control border border-border bg-surface px-2 text-sm" />
          </label>
        </div>
        {mode === "spreadsheet" ? <div className="max-h-[58vh] overflow-auto p-5">
          <input ref={fileInput} type="file" accept=".xlsx" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void inspectSpreadsheet(file); }} />
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void inspectSpreadsheet(file); }} className="flex min-h-32 w-full flex-col items-center justify-center rounded-card border border-dashed border-border bg-app-background/40 px-5 text-center hover:border-[var(--module-accent)]">
            <span className="font-semibold">Drop semester grade spreadsheet here</span>
            <span className="mt-1 text-xs text-text-secondary">or click to choose an Excel file. Nothing saves until you review and confirm.</span>
          </button>
          {preview ? <div className="mt-4 overflow-hidden rounded-card border border-border"><div className="flex flex-wrap justify-between gap-2 border-b border-border bg-[var(--module-tint)] px-4 py-3 text-sm"><span><b>{fileName}</b> · {preview.termLabel}</span><span>{preview.rows.length} rows · {preview.rows.filter((row) => !row.issue).length} ready · {preview.rows.filter((row) => row.issue).length} need attention</span></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-app-background text-xs text-text-secondary"><tr><th className="px-3 py-2">Spreadsheet player</th><th className="px-3 py-2">Roster match</th><th className="px-3 py-2">Hours</th><th className="px-3 py-2">Semester GPA</th><th className="px-3 py-2">Midterm GPA</th><th className="px-3 py-2">Status</th></tr></thead><tbody className="divide-y divide-border">{preview.rows.map((row) => <tr key={row.sourceRow}><td className="px-3 py-2">{row.sourceName}</td><td className="px-3 py-2 font-medium">{row.matchedName ?? "—"}</td><td className="px-3 py-2">{Number.isFinite(row.creditHours) ? row.creditHours : "—"}</td><td className="px-3 py-2">{Number.isFinite(row.semesterGpa) ? row.semesterGpa.toFixed(2) : "—"}</td><td className="px-3 py-2">{row.midtermGpa == null ? "—" : row.midtermGpa.toFixed(2)}</td><td className={`px-3 py-2 text-xs font-semibold ${row.issue ? "text-red-700" : "text-emerald-700"}`}>{row.issue ?? "Ready"}</td></tr>)}</tbody></table></div></div> : null}
        </div> : <div className="max-h-[58vh] overflow-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="sticky top-0 bg-app-background text-xs text-text-secondary"><tr><th className="px-4 py-2">Player</th><th className="px-3 py-2">Hours</th><th className="px-3 py-2">Semester GPA</th><th className="px-3 py-2">Midterm GPA</th></tr></thead>
            <tbody className="divide-y divide-border">
              {people.map((person) => {
                const draft = drafts[person.id] ?? { creditHours: "", semesterGpa: "", midtermGpa: "" };
                const inputClass = "h-9 w-28 rounded-control border border-border bg-surface px-2 text-sm";
                return <tr key={person.id}><td className="px-4 py-2 font-medium">{getDisplayName(person)}</td><td className="px-3 py-2"><input aria-label={`${getDisplayName(person)} hours`} type="number" min="0" max="40" step="0.5" value={draft.creditHours} onChange={(e) => update(person.id, "creditHours", e.target.value)} className={inputClass} /></td><td className="px-3 py-2"><input aria-label={`${getDisplayName(person)} semester GPA`} type="number" min="0" max="4" step="0.001" value={draft.semesterGpa} onChange={(e) => update(person.id, "semesterGpa", e.target.value)} className={inputClass} /></td><td className="px-3 py-2"><input aria-label={`${getDisplayName(person)} midterm GPA`} type="number" min="0" max="4" step="0.001" value={draft.midtermGpa} onChange={(e) => update(person.id, "midtermGpa", e.target.value)} className={inputClass} /></td></tr>;
              })}
            </tbody>
          </table>
        </div>}
        <div className="border-t border-border px-5 py-4">
          {error ? <p role="alert" className="mb-2 text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className="h-9 rounded-control border border-border px-3 text-sm font-semibold">Cancel</button><button type="button" onClick={save} disabled={busy || (mode === "spreadsheet" && (!preview || preview.rows.some((row) => row.issue)))} className={modulePrimaryButtonClassSm}>{busy ? "Saving…" : mode === "spreadsheet" ? `Save ${preview?.rows.length ?? ""} Grades` : "Save Grades"}</button></div>
        </div>
      </div>
    </div>
  );
}
