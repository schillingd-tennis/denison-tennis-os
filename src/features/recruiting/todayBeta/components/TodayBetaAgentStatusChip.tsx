"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { getAcquisitionProviderStatus } from "../backgroundActions";

const ONLINE_WINDOW_MS = 2 * 60_000;

export default function TodayBetaAgentStatusChip() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    function refresh() {
      void getAcquisitionProviderStatus("utr")
        .then((status) => {
          if (!active) return;
          const heartbeatAt = status.heartbeat_at
            ? Date.parse(status.heartbeat_at)
            : Number.NaN;
          setOnline(Number.isFinite(heartbeatAt) && Date.now() - heartbeatAt < ONLINE_WINDOW_MS);
        })
        .catch(() => active && setOnline(false));
    }
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

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
