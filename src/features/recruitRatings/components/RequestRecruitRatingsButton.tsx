"use client";

import { RefreshCw } from "lucide-react";
import { useTransition } from "react";

import { modulePrimaryButtonClass } from "@/components/module-theme";

import { requestRecruitRatingsAction } from "../actions";
import type { RecruitRatingProvider } from "../types";

export default function RequestRecruitRatingsButton({ provider }: { provider: RecruitRatingProvider }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={`${modulePrimaryButtonClass} gap-2`}
      disabled={pending}
      onClick={() => startTransition(async () => requestRecruitRatingsAction(provider))}
    >
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Queuing…" : `Check ${provider.toUpperCase()}`}
    </button>
  );
}
