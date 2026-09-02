"use client";

import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { fetchUtrAgentHealthFromBrowser } from "../utrAgentBrowserClient";

export default function TodayBetaAgentStatusChip() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const health = await fetchUtrAgentHealthFromBrowser();
      setOnline(health.online);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="flex items-center gap-2 text-xs">
      <ShieldCheck
        className={`h-3.5 w-3.5 ${
          online === null
            ? "text-text-secondary"
            : online
              ? "text-green-700"
              : "text-red-700"
        }`}
        aria-hidden
      />
      <span className="font-medium text-text-primary">
        Agent: {online === null ? "…" : online ? "Online" : "Offline"}
      </span>
    </div>
  );
}
