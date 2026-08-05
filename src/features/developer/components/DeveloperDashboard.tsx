"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeft,
  ClipboardCopy,
  Database,
  Download,
  ExternalLink,
  History,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

import {
  forceRefreshFromProviderAction,
  rerunSeedAction,
  resetLocalDatabaseAction,
} from "@/features/developer/actions";
import type { DeveloperSnapshot, ServiceStatus } from "@/features/developer/types";
import { formatDisplay } from "@/lib/formatting";

function statusDotClass(status: ServiceStatus | "connected" | "not_connected"): string {
  switch (status) {
    case "running":
    case "connected":
      return "bg-success";
    case "stopped":
    case "not_connected":
      return "bg-danger";
    default:
      return "bg-text-secondary/40";
  }
}

function statusLabel(status: ServiceStatus | "connected" | "not_connected"): string {
  switch (status) {
    case "running":
      return "Running";
    case "stopped":
      return "Stopped";
    case "connected":
      return "Connected";
    case "not_connected":
      return "Not Connected";
    default:
      return "Unknown";
  }
}

function StatCell({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-control border border-border bg-app-background px-4 py-3">
      <p className="text-[11px] font-medium tracking-wide text-text-secondary uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">
        {formatDisplay(value)}
      </p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-sm text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-sm font-medium break-all text-text-primary sm:text-right">{value}</dd>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  href,
  disabled,
  tone = "neutral",
}: {
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  tone?: "neutral" | "danger";
}) {
  const className = `inline-flex h-10 items-center gap-2 rounded-control border px-3.5 text-sm font-medium transition-colors ${
    disabled
      ? "cursor-not-allowed border-border bg-app-background text-text-secondary/50"
      : tone === "danger"
        ? "border-danger/30 bg-surface text-danger hover:bg-danger/5"
        : "border-border bg-surface text-text-primary hover:border-text-secondary/40 hover:bg-app-background"
  }`;

  const content = (
    <>
      <Icon className="h-4 w-4" strokeWidth={2} />
      {label}
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled} onClick={onClick}>
      {content}
    </button>
  );
}

export default function DeveloperDashboard({ snapshot }: { snapshot: DeveloperSnapshot }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | undefined>();
  const [showMigrations, setShowMigrations] = useState(false);
  const isLocal = snapshot.environment === "local";

  function runAction(action: () => Promise<{ success: boolean; message?: string; error?: string }>) {
    setFeedback(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setFeedback(result.message ?? "Done");
        router.refresh();
      } else {
        setFeedback(result.error ?? "Action failed");
      }
    });
  }

  async function copyEnvironmentInfo() {
    const payload = [
      `Environment: ${snapshot.bannerLabel}`,
      `Supabase URL: ${snapshot.supabaseUrl}`,
      `Connection: ${statusLabel(snapshot.connectionStatus)}`,
      `Migration: ${snapshot.migrationVersion}`,
      `Seed: ${snapshot.seedVersion}`,
      `People: ${snapshot.people.total} (current ${snapshot.people.players}, coaches ${snapshot.people.coaches}, alumni ${snapshot.people.alumni}, staff ${snapshot.people.staff})`,
      `Docker: ${statusLabel(snapshot.dockerStatus)}`,
      `Local Supabase: ${statusLabel(snapshot.localSupabaseStatus)}`,
      `Collected: ${snapshot.collectedAt}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(payload);
      setFeedback("Environment info copied");
    } catch {
      setFeedback("Copy failed");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Settings
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-text-primary">Developer</h1>
        <p className="mt-2.5 text-base text-text-secondary">
          Local diagnostics for the Denison Tennis OS development environment.
        </p>
      </div>

      <div
        className={`rounded-card border px-5 py-4 ${
          isLocal
            ? "border-denison-red/25 bg-denison-red/[0.06]"
            : "border-warning/40 bg-warning/10"
        }`}
        role="status"
      >
        <p
          className={`text-xs font-semibold tracking-[0.14em] uppercase ${
            isLocal ? "text-denison-red" : "text-warning"
          }`}
        >
          {snapshot.bannerLabel}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {isLocal
            ? "Application is reading from the local Supabase stack."
            : "Application is reading from a hosted Supabase project. Local reset/seed actions are disabled."}
        </p>
      </div>

      <section className="rounded-card border border-border bg-surface px-5 py-2">
        <dl>
          <MetaRow label="Current environment" value={isLocal ? "Local" : "Hosted"} />
          <MetaRow label="Supabase URL" value={<span className="font-mono text-xs">{snapshot.supabaseUrl}</span>} />
          <MetaRow
            label="Database status"
            value={
              <span className="inline-flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${statusDotClass(snapshot.connectionStatus)}`}
                />
                {statusLabel(snapshot.connectionStatus)}
              </span>
            }
          />
          <MetaRow label="Migration version" value={snapshot.migrationVersion} />
          <MetaRow
            label="Seed version"
            value={
              snapshot.seedRecords !== undefined
                ? `${snapshot.seedVersion} · ${snapshot.seedRecords} records`
                : snapshot.seedVersion
            }
          />
          <MetaRow
            label="Docker"
            value={
              <span className="inline-flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${statusDotClass(snapshot.dockerStatus)}`} />
                {statusLabel(snapshot.dockerStatus)}
              </span>
            }
          />
          <MetaRow
            label="Local Supabase"
            value={
              <span className="inline-flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${statusDotClass(snapshot.localSupabaseStatus)}`}
                />
                {statusLabel(snapshot.localSupabaseStatus)}
              </span>
            }
          />
        </dl>
        {snapshot.connectionError ? (
          <p className="border-t border-border py-3 text-sm text-danger">{snapshot.connectionError}</p>
        ) : null}
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-wide text-text-secondary uppercase">People</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCell label="Total" value={snapshot.people.total} />
          <StatCell label="Current" value={snapshot.people.players} />
          <StatCell label="Coaches" value={snapshot.people.coaches} />
          <StatCell label="Alumni" value={snapshot.people.alumni} />
          <StatCell label="Staff" value={snapshot.people.staff} />
          <StatCell label="Recruits" value={snapshot.people.recruits} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-wide text-text-secondary uppercase">
          Developer actions
        </h2>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <ActionButton
            label="Reset Local Database"
            icon={RotateCcw}
            tone="danger"
            disabled={!snapshot.localActionsEnabled || pending}
            onClick={() => {
              if (
                !window.confirm(
                  "DESTRUCTIVE: Reset the local database? This permanently destroys all local People data (including UTR, WTN, notes, and manual edits), then re-applies migrations + seed.",
                )
              ) {
                return;
              }
              runAction(resetLocalDatabaseAction);
            }}
          />
          <ActionButton
            label="Re-run Seed"
            icon={RefreshCw}
            disabled={!snapshot.localActionsEnabled || pending}
            onClick={() => {
              if (
                !window.confirm(
                  "Re-apply seed.sql? Fills missing (NULL) values only. Existing Supabase data (hometown, role, contact, UTR, notes, …) is never overwritten. Does not drop the database.",
                )
              ) {
                return;
              }
              runAction(rerunSeedAction);
            }}
          />
          <ActionButton
            label="Force Refresh From Provider"
            icon={Download}
            tone="danger"
            disabled={!snapshot.localActionsEnabled || pending}
            onClick={() => {
              if (
                !window.confirm(
                  "FORCE REFRESH: Overwrite provider-import fields (names, role, status, hometown, contact, class, D#, …) from the import snapshot? App-owned fields (UTR, WTN, notes, …) are preserved. This cannot be undone except by re-editing.",
                )
              ) {
                return;
              }
              runAction(forceRefreshFromProviderAction);
            }}
          />
          <ActionButton
            label="View Migration History"
            icon={History}
            disabled={pending}
            onClick={() => setShowMigrations((open) => !open)}
          />
          <ActionButton
            label="Open Supabase Studio"
            icon={ExternalLink}
            href={snapshot.studioUrl ?? undefined}
            disabled={!snapshot.studioUrl || snapshot.localSupabaseStatus !== "running"}
          />
          <ActionButton
            label="Copy Environment Info"
            icon={ClipboardCopy}
            disabled={pending}
            onClick={() => {
              void copyEnvironmentInfo();
            }}
          />
        </div>
        {feedback ? (
          <p className="mt-3 text-sm text-text-secondary" role="status">
            {pending ? "Running…" : feedback}
          </p>
        ) : pending ? (
          <p className="mt-3 text-sm text-text-secondary" role="status">
            Running…
          </p>
        ) : null}
      </section>

      {showMigrations ? (
        <section className="rounded-card border border-border bg-surface px-5 py-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-text-secondary" strokeWidth={2} />
            <h2 className="text-sm font-semibold text-text-primary">Migration history</h2>
          </div>
          <ol className="mt-3 space-y-1.5 font-mono text-xs text-text-secondary">
            {snapshot.migrations.map((migration) => (
              <li key={migration.name} className="rounded-control bg-app-background px-3 py-2">
                {migration.name}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
