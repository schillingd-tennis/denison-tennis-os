"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Clock3, RefreshCw, ServerCog, ShieldAlert, X } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { UTR_AGENT_BASE_URL } from "@/features/recruiting/todayBeta/utrAgentConfig";

import { resolveAutomationAlertAction } from "../actions";
import type { AutomationHealthSnapshot, AutomationJob, AutomationWorker } from "../types";

const ONLINE_WINDOW_MS = 2 * 60_000;
const formatTime = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "Never";
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function workerOnline(worker: AutomationWorker, collectedAt: string): boolean {
  return Boolean(worker.heartbeatAt && Date.parse(collectedAt) - Date.parse(worker.heartbeatAt) < ONLINE_WINDOW_MS);
}

function latestJob(jobs: AutomationJob[], provider: AutomationWorker["provider"]): AutomationJob | undefined {
  return jobs.find((job) => job.provider === provider);
}

export default function AutomationHealthDashboard({ snapshot }: { snapshot: AutomationHealthSnapshot }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshing(true);
      router.refresh();
      window.setTimeout(() => setRefreshing(false), 600);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [router]);

  const onlineCount = snapshot.workers.filter((worker) => workerOnline(worker, snapshot.collectedAt)).length;
  const activeJobs = snapshot.jobs.filter((job) => job.status === "queued" || job.status === "running").length;
  const criticalCount = snapshot.alerts.filter((alert) => alert.severity === "critical").length;

  async function restartAutomation(): Promise<void> {
    setRestarting(true);
    setRestartError(null);
    try {
      const response = await fetch(`${UTR_AGENT_BASE_URL}/restart-service`, { method: "POST" });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not restart the automation service.");
      window.setTimeout(() => {
        router.refresh();
        setRestarting(false);
      }, 3_000);
    } catch (error) {
      setRestartError(error instanceof Error ? error.message : "Could not restart the automation service.");
      setRestarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"><ArrowLeft className="h-4 w-4" />Settings</Link>
        <PageHeader title="Automation Health" subtitle="Live supervision for the background functions that keep Denison Tennis OS current." actions={<div className="flex flex-wrap items-center gap-2"><button type="button" disabled={restarting} onClick={() => void restartAutomation()} className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3.5 text-sm font-semibold hover:bg-app-background disabled:opacity-60"><ServerCog className={`h-4 w-4 ${restarting ? "animate-pulse" : ""}`} />{restarting ? "Restarting…" : "Restart automations"}</button><button type="button" onClick={() => { setRefreshing(true); router.refresh(); window.setTimeout(() => setRefreshing(false), 600); }} className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3.5 text-sm font-semibold hover:bg-app-background"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button></div>} />
        {restartError ? <p className="mt-3 rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{restartError}</p> : null}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Workers online", value: `${onlineCount}/${snapshot.workers.length}`, icon: ServerCog, tone: onlineCount === snapshot.workers.length ? "text-success bg-success/10 border-success/20" : "text-danger bg-danger/10 border-danger/20" },
          { title: "Active jobs", value: activeJobs, icon: Activity, tone: "text-blue-700 bg-blue-50 border-blue-200" },
          { title: "Open alerts", value: snapshot.alerts.length, icon: AlertTriangle, tone: snapshot.alerts.length ? "text-warning bg-warning/10 border-warning/30" : "text-success bg-success/10 border-success/20" },
          { title: "Critical", value: criticalCount, icon: ShieldAlert, tone: criticalCount ? "text-danger bg-danger/10 border-danger/20" : "text-slate-700 bg-slate-50 border-slate-200" },
        ].map(({ title, value, icon: Icon, tone }) => <article key={title} className={`rounded-card border p-4 shadow-sm ${tone}`}><div className="flex items-start justify-between"><div><p className="text-[11px] font-semibold tracking-wide uppercase">{title}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">{value}</p></div><Icon className="h-5 w-5" /></div></article>)}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {snapshot.workers.map((worker) => {
          const online = workerOnline(worker, snapshot.collectedAt);
          const job = latestJob(snapshot.jobs, worker.provider);
          return <article key={worker.provider} className="rounded-card border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="text-base font-semibold">{worker.provider.toUpperCase()}</h2><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${online ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}><span className={`h-2 w-2 rounded-full ${online ? "bg-success" : "bg-danger"}`} />{online ? "Online" : "Offline"}</span></div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-text-secondary">Authentication</dt><dd className="font-medium">{label(worker.authStatus)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-text-secondary">Last heartbeat</dt><dd className="text-right font-medium">{formatTime(worker.heartbeatAt)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-text-secondary">Last finished</dt><dd className="text-right font-medium">{formatTime(worker.lastFinishedAt)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-text-secondary">Latest job</dt><dd className="font-medium">{job ? `${label(job.status)} · ${job.checkedCount}/${job.totalCount}` : "None"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-text-secondary">Schedule</dt><dd className="font-medium">Wed 4:00 a.m. ET</dd></div>
            </dl>
            {worker.lastError ? <p className="mt-4 rounded-control bg-danger/5 px-3 py-2 text-xs text-danger">{worker.lastError}</p> : null}
          </article>;
        })}
      </section>

      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4"><h2 className="text-base font-semibold">Open alerts</h2><p className="mt-1 text-sm text-text-secondary">The watchdog evaluates workers and jobs every minute. Healthy conditions resolve automatically.</p></div>
        {snapshot.alerts.length ? <div className="divide-y divide-border">{snapshot.alerts.map((alert) => <div key={alert.id} className="flex items-start gap-3 px-5 py-4"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${alert.severity === "critical" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>{alert.severity === "critical" ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{alert.provider?.toUpperCase() ?? "System"}</p><span className="rounded-full bg-app-background px-2 py-0.5 text-[10px] font-semibold tracking-wide text-text-secondary uppercase">{label(alert.code)}</span></div><p className="mt-1 text-sm text-text-secondary">{alert.message}</p><p className="mt-1 text-xs text-text-secondary">First seen {formatTime(alert.firstSeenAt)} · Updated {formatTime(alert.lastSeenAt)}</p></div><button disabled={pending} type="button" title="Dismiss alert" className="rounded-control p-2 text-text-secondary hover:bg-app-background hover:text-text-primary" onClick={() => startTransition(async () => { await resolveAutomationAlertAction(alert.id); router.refresh(); })}><X className="h-4 w-4" /></button></div>)}</div> : <div className="flex items-center gap-3 px-5 py-8 text-sm text-text-secondary"><CheckCircle2 className="h-5 w-5 text-success" />No automation alerts need attention.</div>}
      </section>

      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4"><h2 className="text-base font-semibold">Recent jobs</h2><p className="mt-1 text-sm text-text-secondary">Durable execution history from the current database environment.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-border bg-app-background/60 text-[11px] font-semibold tracking-wide text-text-secondary uppercase"><tr><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Function</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Finished</th><th className="px-4 py-3">Source</th></tr></thead><tbody className="divide-y divide-border">{snapshot.jobs.map((job) => <tr key={job.id}><td className="px-4 py-3 font-semibold">{job.provider.toUpperCase()}</td><td className="px-4 py-3">{label(job.kind)}</td><td className="px-4 py-3">{label(job.scope)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${job.status === "complete" ? "bg-success/10 text-success" : job.status === "queued" || job.status === "running" ? "bg-blue-50 text-blue-700" : job.status === "partial" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}>{label(job.status)}</span></td><td className="px-4 py-3 tabular-nums">{job.checkedCount}/{job.totalCount}</td><td className="px-4 py-3 whitespace-nowrap text-text-secondary">{formatTime(job.requestedAt)}</td><td className="px-4 py-3 whitespace-nowrap text-text-secondary">{formatTime(job.finishedAt)}</td><td className="px-4 py-3">{label(job.source)}</td></tr>)}</tbody></table></div>
      </section>

      <p className="flex items-center gap-2 text-xs text-text-secondary"><Clock3 className="h-3.5 w-3.5" />Auto-refreshes every 15 seconds · Snapshot {formatTime(snapshot.collectedAt)}</p>
    </div>
  );
}
