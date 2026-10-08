"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { modulePrimaryButtonClass } from "@/components/module-theme";

import { getRecruitRatingsJobStatusAction, requestRecruitRatingsAction } from "../actions";
import type { RecruitRatingJobStatus, RecruitRatingProvider } from "../types";

function friendlyError(message: string): string {
  if (message.includes("profile is already in use") || message.includes("ProcessSingleton")) {
    return "Close the dedicated browser, then try again.";
  }
  return message.split("\n")[0] || "Check failed.";
}

export default function RequestRecruitRatingsButton({ provider }: { provider: RecruitRatingProvider }) {
  const router = useRouter();
  const [job, setJob] = useState<RecruitRatingJobStatus | null>(null);
  const [queuing, setQueuing] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const previousStatus = useRef<RecruitRatingJobStatus["status"] | null>(null);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const next = await getRecruitRatingsJobStatusAction(provider);
        if (!active) return;
        const previous = previousStatus.current;
        setJob(next);
        setRequestError(null);
        previousStatus.current = next?.status ?? null;
        if ((previous === "queued" || previous === "running") && next?.status !== "queued" && next?.status !== "running") {
          router.refresh();
        }
      } catch (error) {
        if (active) setRequestError(error instanceof Error ? error.message : "Status unavailable.");
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [provider, router]);

  const active = job?.status === "queued" || job?.status === "running";
  const statusText = job?.status === "queued"
    ? "Queued—waiting for the local worker"
    : job?.status === "running"
      ? `Checking ${job.checkedCount} of ${job.totalCount || "…"}`
      : job?.status === "error" || job?.status === "auth_required"
        ? friendlyError(job.error ?? (job.status === "auth_required" ? "Login required." : "Check failed."))
        : job?.status === "partial"
          ? `Finished ${job.checkedCount} of ${job.totalCount}; some profiles failed.`
          : null;

  async function requestCheck() {
    setQueuing(true);
    setRequestError(null);
    try {
      const next = await requestRecruitRatingsAction(provider);
      setJob(next);
      previousStatus.current = next?.status ?? null;
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Could not queue check.");
    } finally {
      setQueuing(false);
    }
  }

  return (
    <div className="flex min-w-36 flex-col items-stretch gap-1">
      <button
        type="button"
        className={`${modulePrimaryButtonClass} gap-2`}
        disabled={queuing || active}
        onClick={() => void requestCheck()}
      >
        <RefreshCw className={`h-4 w-4 ${queuing || active ? "animate-spin" : ""}`} />
        {queuing ? "Queuing…" : active ? (job?.status === "queued" ? `${provider.toUpperCase()} queued` : `Checking ${provider.toUpperCase()}…`) : `Check ${provider.toUpperCase()}`}
      </button>
      {requestError || statusText ? (
        <p className={`max-w-48 text-center text-[11px] leading-tight ${requestError || job?.status === "error" || job?.status === "auth_required" ? "text-red-700" : "text-text-secondary"}`} role={requestError || job?.status === "error" ? "alert" : "status"}>
          {requestError ?? statusText}
        </p>
      ) : null}
    </div>
  );
}
