"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  getAcquisitionProviderStatus,
  queueAcquisitionJob,
  type AcquisitionProviderStatus,
} from "../backgroundActions";

const ONLINE_WINDOW_MS = 2 * 60_000;
type AcquisitionJobStatus = NonNullable<AcquisitionProviderStatus["job"]>["status"];

function displayTimestamp(value: string | null): string | null {
  return value ? new Date(value).toLocaleString() : null;
}

export default function UtrBackgroundStatus() {
  const router = useRouter();
  const [status, setStatus] = useState<AcquisitionProviderStatus | null>(null);
  const [statusCheckedAt, setStatusCheckedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previousJobStatus = useRef<AcquisitionJobStatus | null>(null);

  function applyStatus(nextStatus: AcquisitionProviderStatus) {
    const previous = previousJobStatus.current;
    const next = nextStatus.job?.status ?? null;
    setStatus(nextStatus);
    setStatusCheckedAt(Date.now());
    setError(null);
    previousJobStatus.current = next;
    if (
      (previous === "queued" || previous === "running") &&
      next !== "queued" &&
      next !== "running"
    ) {
      router.refresh();
    }
  }

  useEffect(() => {
    let active = true;
    function refresh() {
      void getAcquisitionProviderStatus("utr")
        .then((nextStatus) => active && applyStatus(nextStatus))
        .catch((cause) =>
          active && setError(cause instanceof Error ? cause.message : "Status unavailable"),
        );
    }
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const online = Boolean(
    statusCheckedAt > 0 &&
      status?.heartbeat_at &&
      statusCheckedAt - Date.parse(status.heartbeat_at) < ONLINE_WINDOW_MS,
  );
  const queued = status?.job?.status === "queued";
  const running = status?.job?.status === "running";
  const reauth = status?.auth_status === "reauth_required";
  const lastFinished = displayTimestamp(status?.last_finished_at ?? null);
  const visibleError = error ?? status?.last_error ?? status?.job?.error ?? null;

  async function requestCheck() {
    setBusy(true);
    try {
      await queueAcquisitionJob("utr");
      applyStatus(await getAcquisitionProviderStatus("utr"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not queue check");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">UTR acquisition worker</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Runs independently through the shared tennis-data queue; Today Beta may be closed.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || queued || running || !online || reauth}
          className="rounded-control bg-[var(--module-accent)] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void requestCheck()}
        >
          {busy
            ? "Queuing…"
            : running
              ? "Check running"
              : queued
                ? "Check queued"
                : "Check results now"}
        </button>
      </div>

      <p className="text-sm text-text-primary" role="status">
        Worker: {status ? (online ? "Online" : "Offline") : "Checking…"}
        {running
          ? ` · Running · ${status?.job?.checked_count ?? 0}/${status?.job?.total_count ?? 0}`
          : ""}
        {reauth ? " · UTR reauthentication required" : ""}
      </p>
      <p className="text-xs text-text-secondary">
        TRN and WTN adapters: not configured · Last UTR attempt: {lastFinished ?? "Never"}
      </p>
      {visibleError ? (
        <p role="alert" className="text-sm text-red-700">
          {visibleError}
        </p>
      ) : null}
    </section>
  );
}
