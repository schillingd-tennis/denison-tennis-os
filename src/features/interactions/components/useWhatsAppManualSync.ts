"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  getWhatsAppSyncStatusAction,
  queueWhatsAppSyncAction,
} from "@/features/interactions/whatsappSync/actions";
import type { WhatsAppUiStatus } from "@/features/interactions/whatsappSync/settingsStatus";

export function useWhatsAppManualSync(options: {
  initialStatus: WhatsAppUiStatus;
  initialError: string | null;
  signedIn: boolean;
  local: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(options.initialStatus);
  const [error, setError] = useState<string | null>(options.initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const disabled = !options.signedIn || !options.local || pending;

  function queueSync() {
    if (disabled) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const queued = await queueWhatsAppSyncAction();
      if (!queued.ok) {
        setError(queued.error);
        return;
      }
      setStatus(queued.status);
      setNotice(queued.hint.slice(0, 48));
      const latest = await getWhatsAppSyncStatusAction();
      if (latest.ok) setStatus(latest.status);
      router.refresh();
    });
  }

  return { status, error, notice, pending, disabled, queueSync };
}
