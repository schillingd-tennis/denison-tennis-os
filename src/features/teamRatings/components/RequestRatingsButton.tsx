"use client";

import { RefreshCw } from "lucide-react";
import { useTransition } from "react";

import { modulePrimaryButtonClass } from "@/components/module-theme";

import { requestTeamUtrRatingsAction } from "../actions";

export default function RequestRatingsButton() {
  const [pending, startTransition] = useTransition();
  return <button
    type="button"
    className={`${modulePrimaryButtonClass} gap-2`}
    disabled={pending}
    onClick={() => startTransition(async () => requestTeamUtrRatingsAction())}
  >
    <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
    {pending ? "Queuing…" : "Check UTR ratings"}
  </button>;
}
