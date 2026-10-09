"use client";

import { Check, CircleUserRound, UsersRound } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";

import type { ScoutingReportType } from "@/features/scouting/types";

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100";
const textAreaClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100";

export default function PublicScoutingForm({ rawToken, prefill }: {
  rawToken: string;
  prefill: { label: string; teamDisplayName: string; playerDisplayName: string; revoked: boolean; expiresAt: string | null; invalid: boolean };
}) {
  const [reportType, setReportType] = useState<ScoutingReportType | null>(null);
  const [message, setMessage] = useState<string>();
  const [done, setDone] = useState(false);
  const [opponentOneName, setOpponentOneName] = useState(prefill.playerDisplayName);
  const [opponentTwoName, setOpponentTwoName] = useState("");
  const [pending, startTransition] = useTransition();
  void prefill.expiresAt;

  if (prefill.invalid) return <PublicShell title="Form unavailable" body="This scouting form link is invalid." />;
  if (prefill.revoked) return <PublicShell title="Form unavailable" body="This scouting form link has been revoked." />;
  if (done) return <PublicShell title="Report submitted" body="Thanks. Your report has been added to the appropriate opponent team workspace." success />;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff1f2_0,transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_70%)] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-700 text-lg font-black text-white shadow-lg shadow-red-200">D</div>
          <p className="text-xs font-bold tracking-[0.18em] text-red-700 uppercase">Denison Tennis</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{prefill.label || "Post-match scouting"}</h1>
          <p className="mt-2 text-sm text-slate-500">Capture what matters now so the team is prepared next time.</p>
        </header>

        <form onSubmit={(event) => {
          event.preventDefault();
          setMessage(undefined);
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            try {
              const response = await fetch(`/api/scouting-form/${encodeURIComponent(rawToken)}`, {
                method: "POST",
                body: formData,
              });
              const result = (await response.json()) as { success: boolean; message?: string };
              if (response.ok && result.success) setDone(true);
              else setMessage(result.message || "Could not submit the scouting report.");
            } catch {
              setMessage("Could not connect to the scouting service. Please try again.");
            }
          });
        }}>
          <input type="hidden" name="reportType" value={reportType ?? ""} />
          <input type="hidden" name="isDoubles" value={reportType === "doubles" ? "true" : "false"} />
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
              <StepLabel number="1" title="Choose the report type" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ReportTypeButton active={reportType === "singles"} icon={<CircleUserRound className="h-6 w-6" />} title="Singles" description="One opponent and individual tendencies" onClick={() => setReportType("singles")} />
                <ReportTypeButton active={reportType === "doubles"} icon={<UsersRound className="h-6 w-6" />} title="Doubles" description="Two opponents, court sides and serving order" onClick={() => setReportType("doubles")} />
              </div>
            </div>

            {reportType ? (
              <div className="space-y-7 px-5 py-6 sm:px-8 sm:py-8">
                <section>
                  <StepLabel number="2" title={reportType === "doubles" ? "Identify the doubles team" : "Identify the opponent"} />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label={reportType === "doubles" ? "Opponent 1 name" : "Opponent name"} required><input name="opponentDisplayName" value={opponentOneName} onChange={(event) => setOpponentOneName(event.target.value)} required className={inputClass} placeholder="First and last name" /></Field>
                    {reportType === "doubles" ? <Field label="Opponent 2 name" required><input name="opponentTwoDisplayName" value={opponentTwoName} onChange={(event) => setOpponentTwoName(event.target.value)} required className={inputClass} placeholder="First and last name" /></Field> : <Field label="Handedness"><select name="handedness" className={inputClass} defaultValue=""><option value="">Unknown</option><option value="Right">Right-handed</option><option value="Left">Left-handed</option></select></Field>}
                    <Field label="Opponent team" required><input name="teamDisplayName" defaultValue={prefill.teamDisplayName} required className={inputClass} placeholder="School or club" /></Field>
                    <Field label="Match date"><input name="matchDate" type="date" className={inputClass} /></Field>
                  </div>
                </section>

                {reportType === "doubles" ? <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5"><h2 className="text-sm font-bold text-indigo-950">Doubles alignment</h2><p className="mt-1 text-xs text-indigo-700">The player names below update automatically from the opponent fields above.</p><div className="mt-4 grid gap-4 sm:grid-cols-3"><PlayerSelect name="deuceSide" label="Deuce side" opponentOneName={opponentOneName} opponentTwoName={opponentTwoName} /><PlayerSelect name="adSide" label="Ad side" opponentOneName={opponentOneName} opponentTwoName={opponentTwoName} /><PlayerSelect name="servesFirst" label="Serves first" opponentOneName={opponentOneName} opponentTwoName={opponentTwoName} /></div></section> : null}

                <section>
                  <StepLabel number="3" title="Add your scouting notes" />
                  <div className="mt-4 grid gap-4">
                    <Field label="Strengths, weaknesses and tendencies" required hint="Include patterns, preferred shots, positioning and pressure responses."><textarea name="strengthsWeaknesses" rows={7} required className={textAreaClass} placeholder="What should a teammate know before playing this opponent?" /></Field>
                    <Field label="Additional scouting notes" hint="Optional context, adjustments, or match-specific observations."><textarea name="scoutingReport" rows={4} className={textAreaClass} /></Field>
                    <Field label="Your name" required><input name="reportBy" required className={inputClass} placeholder="Who completed this report?" /></Field>
                  </div>
                </section>
                {message ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{message}</p> : null}
                <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-red-700 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-60">{pending ? "Submitting report…" : `Submit ${reportType} report`}</button>
                <p className="text-center text-xs text-slate-400">The report will be filed in the opponent team’s Adaptive Workspace.</p>
              </div>
            ) : <div className="px-5 py-10 text-center text-sm text-slate-500 sm:px-8">Choose Singles or Doubles to open the correct scouting form.</div>}
          </section>
        </form>
      </div>
    </main>
  );
}

function StepLabel({ number, title }: { number: string; title: string }) { return <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">{number}</span><h2 className="text-base font-bold text-slate-900">{title}</h2></div>; }
function ReportTypeButton({ active, icon, title, description, onClick }: { active: boolean; icon: ReactNode; title: string; description: string; onClick: () => void }) { return <button type="button" aria-pressed={active} onClick={onClick} className={`relative flex items-center gap-4 rounded-2xl border p-4 text-left transition ${active ? "border-red-500 bg-red-50 ring-4 ring-red-100" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active ? "bg-red-700 text-white" : "bg-slate-100 text-slate-600"}`}>{icon}</span><span><span className="block text-sm font-bold text-slate-900">{title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span></span>{active ? <Check className="absolute top-3 right-3 h-4 w-4 text-red-700" /> : null}</button>; }
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}{required ? <span className="ml-1 text-red-600">*</span> : null}</span>{children}{hint ? <span className="mt-1.5 block text-xs leading-5 text-slate-500">{hint}</span> : null}</label>; }
function PlayerSelect({ name, label, opponentOneName, opponentTwoName }: { name: string; label: string; opponentOneName: string; opponentTwoName: string }) { return <Field label={label} required><select name={name} required defaultValue="" className={inputClass}><option value="" disabled>Select player</option><option value="opponent_1" disabled={!opponentOneName.trim()}>{opponentOneName.trim() || "Enter Opponent 1 above"}</option><option value="opponent_2" disabled={!opponentTwoName.trim()}>{opponentTwoName.trim() || "Enter Opponent 2 above"}</option></select></Field>; }
function PublicShell({ title, body, success = false }: { title: string; body: string; success?: boolean }) { return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">{success ? <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-6 w-6" /></span> : null}<h1 className="text-2xl font-bold text-slate-950">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{body}</p></div></main>; }
