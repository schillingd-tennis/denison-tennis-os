"use client";

import { RefreshCw } from "lucide-react";
import { useTransition } from "react";

import { modulePrimaryButtonClass } from "@/components/module-theme";

import { requestTeamUtrRatingsAction, requestTeamWtnRatingsAction } from "../actions";

export default function RequestRatingsButton({ provider }: { provider: "utr" | "wtn" }) {
  const [pending, startTransition] = useTransition();
  const action = provider === "utr" ? requestTeamUtrRatingsAction : requestTeamWtnRatingsAction;
  const buttonLabel = provider === "wtn" ? "Check WTN Status" : "Check UTR ratings";
  return <button
    type="button"
    className={`${modulePrimaryButtonClass} gap-2`}
    disabled={pending}
    onClick={() => startTransition(async () => action())}
  >
    <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
    {pending ? "Queuing…" : buttonLabel}
  </button>;
}
