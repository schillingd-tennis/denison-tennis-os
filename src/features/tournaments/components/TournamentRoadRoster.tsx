"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, ClipboardPaste, Eye, ExternalLink, Link2, MapPin, Pencil, RefreshCw, Search, Star, UserPlus, Users } from "lucide-react";

import { recruitingPersonPath } from "@/lib/module-routes";
import { addPotentialRecruitsAndEnrichAction, importTournamentParticipantsAction, promoteTournamentParticipantsAction, saveTournamentParticipantDetailsAction, saveTournamentParticipantEvaluationAction } from "../actions";
import type { TournamentParticipant, TournamentParticipantDetails, TournamentParticipantEvaluation } from "../types";

const QUICK_TAGS = ["Athletic", "Competitor", "Big serve", "High upside", "Follow up"];

function locationLine(participant: TournamentParticipant) {
  return [participant.city, participant.state].filter(Boolean).join(", ") || "Location unavailable";
}

function eventSummary(participant: TournamentParticipant) {
  return participant.events.join(" · ") || "Events unavailable";
}

function trnRatingLabel(participant: TournamentParticipant) {
  const starLabel = participant.trnStarRating === 6
    ? "Blue Chip"
    : participant.trnStarRating
      ? `${participant.trnStarRating}-star`
      : null;
  return [participant.trnRank ? `TRN #${participant.trnRank}` : null, starLabel].filter(Boolean).join(" · ");
}

export default function TournamentRoadRoster({
  tournamentId,
  initialParticipants,
}: {
  tournamentId: string;
  initialParticipants: TournamentParticipant[];
}) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [selectedId, setSelectedId] = useState(initialParticipants[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "watch" | "linked" | "not_linked" | "ambiguous" | "missing_trn">("all");
  const [selectedForRecruiting, setSelectedForRecruiting] = useState<string[]>([]);
  const [showImport, setShowImport] = useState(initialParticipants.length === 0);
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return participants.filter((participant) => {
      const matchesFilter = filter === "all"
        || (filter === "watch" && participant.watchList)
        || (filter === "linked" && Boolean(participant.recruitPersonId))
        || (filter === "not_linked" && !participant.recruitPersonId && participant.recruitLinkStatus !== "ambiguous")
        || (filter === "ambiguous" && participant.recruitLinkStatus === "ambiguous")
        || (filter === "missing_trn" && !participant.trnRank && !participant.trnUrl);
      const haystack = `${participant.participantName} ${participant.city ?? ""} ${participant.state ?? ""} ${participant.recruitPriorityLabel ?? ""} ${participant.recruitPipelineLabel ?? ""} ${participant.events.join(" ")}`.toLowerCase();
      return matchesFilter && (!normalized || haystack.includes(normalized));
    });
  }, [filter, participants, query]);
  const selected = participants.find((participant) => participant.id === selectedId) ?? visible[0] ?? null;
  const evaluatedCount = participants.filter((participant) => participant.evaluationStatus === "evaluated").length;

  function importRoster() {
    setMessage(null);
    startTransition(async () => {
      const result = await importTournamentParticipantsAction(tournamentId, importText);
      if (!result.success) return setMessage(result.error);
      setParticipants(result.participants);
      setSelectedId(result.participants[0]?.id ?? null);
      setImportText("");
      setShowImport(false);
      const matched = result.participants.filter((item) => item.recruitLinkStatus === "matched").length;
      const review = result.participants.filter((item) => ["ambiguous", "unmatched"].includes(item.recruitLinkStatus)).length;
      setMessage(`${result.participants.length} tournament players imported · ${matched} linked to Recruiting OS${review ? ` · ${review} remain tournament-only or need match review` : ""}. Public TRN enrichment was queued.`);
    });
  }

  function matchAndEnrichField() {
    setMessage(null);
    startTransition(async () => {
      const result = await addPotentialRecruitsAndEnrichAction(tournamentId);
      if (!result.success) return setMessage(result.error);
      setParticipants(result.summary.participants);
      setMessage(`${result.summary.queued} public TRN lookups queued. Refresh this page after the Mac worker finishes; no Recruiting OS profiles were created.`);
    });
  }

  function addSelectedRecruits() {
    if (!selectedForRecruiting.length) return;
    setMessage(null);
    startTransition(async () => {
      const result = await promoteTournamentParticipantsAction(tournamentId, selectedForRecruiting);
      if (!result.success) return setMessage(result.error);
      setParticipants(result.participants);
      setSelectedForRecruiting([]);
      setMessage(`${result.created} selected player${result.created === 1 ? "" : "s"} added to Recruiting OS as Potential recruits and linked to this tournament.`);
    });
  }

  function saveEvaluation(participant: TournamentParticipant, evaluation: TournamentParticipantEvaluation, moveNext: boolean) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveTournamentParticipantEvaluationAction(tournamentId, participant.id, evaluation);
      if (!result.success) return setMessage(result.error);
      const updated = participants.map((item) => item.id === result.participant.id ? result.participant : item);
      setParticipants(updated);
      if (moveNext) {
        const index = visible.findIndex((item) => item.id === participant.id);
        const next = visible[index + 1] ?? visible[0];
        if (next) setSelectedId(next.id);
      }
      setMessage(moveNext ? "Evaluation saved. Next player opened." : "Evaluation saved.");
    });
  }

  function toggleWatch(participant: TournamentParticipant) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveTournamentParticipantEvaluationAction(tournamentId, participant.id, {
        evaluationStatus: participant.evaluationStatus === "watch_list" ? "not_evaluated" : participant.evaluationStatus,
        watchList: !participant.watchList,
        overallRating: participant.overallRating,
        quickTags: participant.quickTags,
        evaluationNotes: participant.evaluationNotes,
      });
      if (!result.success) return setMessage(result.error);
      setParticipants((current) => current.map((item) => item.id === result.participant.id ? result.participant : item));
    });
  }

  function saveDetails(participant: TournamentParticipant, details: TournamentParticipantDetails) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveTournamentParticipantDetailsAction(tournamentId, participant.id, details);
      if (!result.success) return setMessage(result.error);
      setParticipants((current) => current.map((item) => item.id === result.participant.id ? result.participant : item));
      setMessage("Player information saved.");
    });
  }

  return (
    <section aria-label="Tournament road recruiting dashboard" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Users className="h-4 w-4 text-warning" />Tournament Players</div>
          <p className="mt-1 text-xs text-text-secondary">{participants.length} players · {participants.filter((item) => item.recruitPersonId).length} in Recruiting OS · {participants.filter((item) => item.watchList).length} to watch · {evaluatedCount} evaluated</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {selectedForRecruiting.length ? <button type="button" disabled={pending} onClick={addSelectedRecruits} className="inline-flex h-10 items-center gap-2 rounded-control bg-denison-red px-3 text-sm font-semibold text-white disabled:opacity-40"><UserPlus className="h-4 w-4" /> Add selected ({selectedForRecruiting.length})</button> : null}
          <button type="button" disabled={pending || participants.length === 0} onClick={matchAndEnrichField} className="inline-flex h-10 items-center gap-2 rounded-control border border-denison-red bg-surface px-3 text-sm font-semibold text-denison-red hover:bg-denison-red/[0.05] disabled:opacity-40"><RefreshCw className="h-4 w-4" /> Match & enrich field</button>
          <button type="button" onClick={() => setShowImport((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-semibold text-text-primary hover:bg-app-background"><ClipboardPaste className="h-4 w-4" /> Import Players</button>
        </div>
      </div>

      {showImport ? (
        <div className="rounded-card border border-[var(--module-accent)]/20 bg-[var(--module-tint)]/35 p-3">
          <label className="text-sm font-semibold text-text-primary" htmlFor="tournament-participants-paste">Paste tournament participant list</label>
          <p className="mt-1 text-xs text-text-secondary">Accepts the USTA columns: Participant name, Events, City/State, and Gender. Existing recruits are linked automatically. Everyone else stays in this tournament review pool until you choose Add selected.</p>
          <textarea id="tournament-participants-paste" value={importText} onChange={(event) => setImportText(event.target.value)} rows={7} className="mt-3 w-full rounded-control border border-border bg-surface p-3 text-base text-text-primary" placeholder={'Participant name\tEvents\tCity, State\tGender\nACOSTA-STUEHMKE, Matias\tBoys\' 18 & under Singles\tNew York, NY\tM'} />
          <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setShowImport(false)} className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-semibold">Cancel</button><button type="button" disabled={pending || !importText.trim()} onClick={importRoster} className="h-10 rounded-control bg-denison-red px-4 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Importing…" : "Add players"}</button></div>
        </div>
      ) : null}

      {message ? <p role="status" className="rounded-control bg-[var(--module-tint)] px-3 py-2 text-sm text-text-primary">{message}</p> : null}

      {participants.length === 0 ? (
        <div className="rounded-card border border-dashed border-border px-5 py-10 text-center"><Users className="mx-auto h-7 w-7 text-text-secondary" /><p className="mt-3 text-sm font-semibold text-text-primary">No tournament players yet</p><p className="mt-1 text-sm text-text-secondary">Paste the participant list to build the road recruiting dashboard.</p></div>
      ) : (
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(320px,0.9fr)_minmax(400px,1.1fr)]">
          <div className="min-w-0 rounded-card border border-border bg-surface p-3">
            <label className="relative block"><Search className="absolute left-3 top-3.5 h-4 w-4 text-text-secondary" /><span className="sr-only">Search tournament players</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-control border border-border bg-app-background pl-9 pr-3 text-base" placeholder="Search player, city, state…" /></label>
            <div className="mt-2 flex flex-wrap gap-2">
              {([['all', `All (${participants.length})`], ['watch', `To watch (${participants.filter((item) => item.watchList).length})`], ['linked', `In Recruiting OS (${participants.filter((item) => item.recruitPersonId).length})`], ['not_linked', `Not in database (${participants.filter((item) => !item.recruitPersonId && item.recruitLinkStatus !== 'ambiguous').length})`], ['ambiguous', 'Possible matches'], ['missing_trn', 'Missing TRN']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`h-9 shrink-0 rounded-control px-3 text-xs font-semibold ${filter === value ? "bg-denison-red text-white" : "border border-border bg-surface text-text-secondary"}`}>{label}</button>)}
            </div>
            <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {visible.map((participant) => <div key={participant.id} className={`w-full overflow-hidden rounded-control border text-left ${selected?.id === participant.id ? "border-denison-red bg-denison-red/[0.05]" : "border-border bg-surface hover:bg-app-background"}`}>
                <button type="button" onClick={() => setSelectedId(participant.id)} className="flex w-full min-w-0 items-start gap-3 p-3 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-warning/15 text-xs font-bold text-warning">{participant.participantName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text-primary">{participant.participantName}</span><span className="mt-0.5 block truncate text-xs text-text-secondary">{locationLine(participant)}{participant.classYear ? ` · Class of ${participant.classYear}` : ""}</span><span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1"><span className={`text-[10px] font-bold uppercase ${trnRatingLabel(participant) ? "text-denison-red" : "text-text-secondary"}`}>{trnRatingLabel(participant) || "TRN lookup needed"}</span><span aria-hidden="true" className="text-border">•</span><span className={`text-[10px] font-bold uppercase ${participant.recruitPersonId ? "text-success" : participant.recruitLinkStatus === "ambiguous" ? "text-warning" : "text-text-secondary"}`}>{participant.recruitPersonId ? `Recruiting OS · ${participant.recruitPriorityLabel || participant.recruitPipelineLabel || "No status assigned"}` : participant.recruitLinkStatus === "ambiguous" ? "Possible match — review" : "Not in Recruiting OS"}</span></span></span>
                </button>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-3 py-2">
                  <span className={`text-[10px] font-bold uppercase ${participant.evaluationStatus === "evaluated" ? "text-success" : "text-text-secondary"}`}>{participant.evaluationStatus === "evaluated" ? "Evaluated" : "Not evaluated"}</span>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <label className={`flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-control border px-2 text-[10px] font-bold uppercase ${participant.watchList ? "border-warning bg-warning/10 text-warning" : "border-border bg-surface text-text-secondary"}`} title="Mark as a player to watch"><input type="checkbox" className="h-4 w-4 accent-denison-red" checked={participant.watchList} onChange={() => toggleWatch(participant)} disabled={pending} /><Eye className="h-3.5 w-3.5" /><span>Watch</span></label>
                    {participant.recruitPersonId ? <Link href={recruitingPersonPath(participant.recruitPersonId)} aria-label={`Open ${participant.participantName} recruiting card`} title="Open recruiting card" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-border bg-surface px-2 text-[10px] font-bold uppercase text-text-secondary transition-colors hover:border-denison-red hover:bg-denison-red/[0.06] hover:text-denison-red"><Link2 className="h-3.5 w-3.5" />Profile</Link> : participant.recruitLinkStatus !== "ambiguous" ? <label className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-control border border-border bg-surface px-2 text-[10px] font-bold uppercase text-text-secondary" title="Select to add as a Potential recruit"><input type="checkbox" className="h-4 w-4 accent-denison-red" checked={selectedForRecruiting.includes(participant.id)} onChange={() => setSelectedForRecruiting((current) => current.includes(participant.id) ? current.filter((id) => id !== participant.id) : [...current, participant.id])} /><span>Add recruit</span><span className="sr-only">Select {participant.participantName} to add to Recruiting OS</span></label> : <span className="text-[10px] font-bold uppercase text-warning">Review match</span>}
                  </div>
                </div>
              </div>)}
              {visible.length === 0 ? <p className="py-8 text-center text-sm text-text-secondary">No players match these filters.</p> : null}
            </div>
          </div>
          {selected ? <TournamentParticipantEvaluationCard key={selected.id} participant={selected} pending={pending} onSave={saveEvaluation} onSaveDetails={saveDetails} /> : null}
        </div>
      )}
    </section>
  );
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function TournamentParticipantEvaluationCard({ participant, pending, onSave, onSaveDetails }: { participant: TournamentParticipant; pending: boolean; onSave: (participant: TournamentParticipant, evaluation: TournamentParticipantEvaluation, moveNext: boolean) => void; onSaveDetails: (participant: TournamentParticipant, details: TournamentParticipantDetails) => void }) {
  const [rating, setRating] = useState<number | null>(participant.overallRating);
  const [tags, setTags] = useState<string[]>(participant.quickTags);
  const [notes, setNotes] = useState(participant.evaluationNotes ?? "");
  const [status, setStatus] = useState(participant.evaluationStatus === "watch_list" ? "not_evaluated" : participant.evaluationStatus);
  const [editingDetails, setEditingDetails] = useState(false);
  const [city, setCity] = useState(participant.city ?? "");
  const [state, setState] = useState(participant.state ?? "");
  const [classYear, setClassYear] = useState(participant.classYear?.toString() ?? "");
  const [utr, setUtr] = useState(participant.utr?.toString() ?? "");
  const [trnRank, setTrnRank] = useState(participant.trnRank?.toString() ?? "");
  const [trnStars, setTrnStars] = useState(participant.trnStarRating?.toString() ?? "");
  const evaluation = (): TournamentParticipantEvaluation => ({ evaluationStatus: status, watchList: participant.watchList, overallRating: rating, quickTags: tags, evaluationNotes: notes || null });
  return <article className="min-w-0 rounded-card border border-border bg-surface p-4">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-semibold text-text-primary">{participant.participantName}</h3><p className="mt-1 flex items-center gap-1 text-xs text-text-secondary"><MapPin className="h-3.5 w-3.5" />{locationLine(participant)}{participant.classYear ? ` · Class of ${participant.classYear}` : ""}{participant.utr ? ` · UTR ${participant.utr.toFixed(2)}` : ""}</p><p className={`mt-1 text-xs font-semibold ${participant.recruitPersonId ? "text-success" : participant.recruitLinkStatus === "ambiguous" ? "text-warning" : "text-text-secondary"}`}>{participant.recruitPersonId ? `Recruiting OS · ${participant.recruitPriorityLabel || "No recruiting status assigned"}${participant.recruitPipelineLabel ? ` · ${participant.recruitPipelineLabel}` : ""}` : participant.recruitLinkStatus === "ambiguous" ? "Possible Recruiting OS match needs review" : "Not in Recruiting OS"}</p></div><select aria-label="Evaluation status" value={status} onChange={(event) => setStatus(event.target.value as "not_evaluated" | "evaluated")} className="h-10 rounded-control border border-border bg-surface px-2 text-sm"><option value="not_evaluated">Not evaluated</option><option value="evaluated">Evaluated</option></select></div>
    <div className="mt-3 rounded-control border border-border bg-app-background/60 p-3">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-text-primary">Player information</p><p className="mt-0.5 text-[11px] text-text-secondary">Add missing ratings and biographical details manually.</p></div><button type="button" onClick={() => setEditingDetails((value) => !value)} className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-xs font-semibold text-text-primary"><Pencil className="h-3.5 w-3.5" />{editingDetails ? "Cancel" : "Edit"}</button></div>
      {editingDetails ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-text-secondary">City<input value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-2.5 text-sm font-normal text-text-primary" /></label>
        <label className="text-xs font-semibold text-text-secondary">State<input value={state} onChange={(event) => setState(event.target.value)} maxLength={2} className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-2.5 text-sm font-normal uppercase text-text-primary" /></label>
        <label className="text-xs font-semibold text-text-secondary">Class year<input value={classYear} onChange={(event) => setClassYear(event.target.value)} inputMode="numeric" placeholder="2028" className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-2.5 text-sm font-normal text-text-primary" /></label>
        <label className="text-xs font-semibold text-text-secondary">UTR<input value={utr} onChange={(event) => setUtr(event.target.value)} inputMode="decimal" placeholder="10.75" className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-2.5 text-sm font-normal text-text-primary" /></label>
        <label className="text-xs font-semibold text-text-secondary">TRN rank<input value={trnRank} onChange={(event) => setTrnRank(event.target.value)} inputMode="numeric" placeholder="125" className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-2.5 text-sm font-normal text-text-primary" /></label>
        <label className="text-xs font-semibold text-text-secondary">TRN rating<select value={trnStars} onChange={(event) => setTrnStars(event.target.value)} className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-2.5 text-sm font-normal text-text-primary"><option value="">Unknown</option><option value="1">1-star</option><option value="2">2-star</option><option value="3">3-star</option><option value="4">4-star</option><option value="5">5-star</option><option value="6">Blue Chip</option></select></label>
        <button type="button" disabled={pending} onClick={() => { onSaveDetails(participant, { city: city.trim() || null, state: state.trim() || null, classYear: optionalNumber(classYear), utr: optionalNumber(utr), trnRank: optionalNumber(trnRank), trnStarRating: optionalNumber(trnStars) }); setEditingDetails(false); }} className="col-span-2 h-10 rounded-control bg-denison-red text-sm font-semibold text-white disabled:opacity-40 sm:col-span-3">Save player information</button>
      </div> : <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary"><span>Class: {participant.classYear ?? "—"}</span><span>UTR: {participant.utr?.toFixed(2) ?? "—"}</span><span>TRN: {trnRatingLabel(participant) || "—"}</span><span>Hometown: {locationLine(participant)}</span></div>}
    </div>
    <div className={`mt-4 flex items-center justify-between gap-3 rounded-control border px-3 py-2.5 ${trnRatingLabel(participant) ? "border-denison-red/25 bg-denison-red/[0.05]" : "border-warning/25 bg-warning/[0.07]"}`}>
      <div><p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">TennisRecruiting.net</p><p className={`mt-0.5 text-sm font-bold ${trnRatingLabel(participant) ? "text-denison-red" : "text-warning"}`}>{trnRatingLabel(participant) || "Rating lookup needed"}</p></div>
      {participant.trnUrl ? <a href={participant.trnUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-xs font-semibold text-text-primary hover:border-denison-red hover:text-denison-red">Open TRN <ExternalLink className="h-3.5 w-3.5" /></a> : <a href="https://www.tennisrecruiting.net/player.asp" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-xs font-semibold text-text-primary hover:border-denison-red hover:text-denison-red">Find player <ExternalLink className="h-3.5 w-3.5" /></a>}
    </div>
    <p className="mt-3 text-xs leading-relaxed text-text-secondary">{eventSummary(participant)}</p>
    <div className="mt-5"><p className="text-sm font-semibold text-text-primary">Overall impression</p><div className="mt-2 grid grid-cols-5 gap-2">{[1,2,3,4,5].map((value) => <button type="button" key={value} onClick={() => setRating(value)} className={`flex h-11 items-center justify-center gap-1 rounded-control border text-sm font-semibold ${rating === value ? "border-denison-red bg-denison-red text-white" : "border-border bg-surface"}`}><Star className="h-3.5 w-3.5" />{value}</button>)}</div></div>
    <div className="mt-5"><p className="text-sm font-semibold text-text-primary">Quick tags</p><div className="mt-2 flex flex-wrap gap-2">{QUICK_TAGS.map((tag) => <button type="button" key={tag} onClick={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} className={`h-9 rounded-control border px-3 text-xs font-semibold ${tags.includes(tag) ? "border-denison-red bg-denison-red/[0.07] text-denison-red" : "border-border text-text-secondary"}`}>{tags.includes(tag) ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}{tag}</button>)}</div></div>
    <label className="mt-5 block text-sm font-semibold text-text-primary">Coach notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={6} className="mt-2 w-full rounded-control border border-border bg-app-background p-3 text-base font-normal" placeholder="Fast notes while watching…" /></label>
    <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={pending} onClick={() => onSave(participant, evaluation(), false)} className="h-11 rounded-control border border-border bg-surface text-sm font-semibold disabled:opacity-40">Save</button><button type="button" disabled={pending} onClick={() => onSave(participant, { ...evaluation(), evaluationStatus: "evaluated" }, true)} className="h-11 rounded-control bg-denison-red text-sm font-semibold text-white disabled:opacity-40">Save & next</button></div>
  </article>;
}
