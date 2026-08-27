import { MessageSquare } from "lucide-react";

import type { SyncStatus } from "@/features/interactions/appleMessagesSync/ports";
import {
  CONNECTION_DESCRIPTION,
  formatLastSuccessfulSync,
  formatLastSyncWithNewInteractions,
  latestImportedCountLabel,
  settingsStatusLabel,
} from "@/features/interactions/appleMessagesSync/settingsStatus";

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/[0.06] py-2.5 last:border-b-0">
      <dt className="min-w-0 text-[13px] text-text-secondary">{label}</dt>
      <dd className="shrink-0 text-right text-[13px] font-medium text-text-primary">{value}</dd>
    </div>
  );
}

export default function InteractionsAppleMessagesPanel({
  status,
  error,
}: {
  status: SyncStatus;
  error: string | null;
}) {
  return (
    <section className="rounded-card border border-black/[0.06] bg-surface px-4 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-control bg-research/10 text-research">
          <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">Apple Messages</h3>
          <p className="mt-0.5 text-[12px] text-text-secondary">
            {error ? "Status unavailable from this session." : CONNECTION_DESCRIPTION}
          </p>
        </div>
      </div>
      <dl className="mt-3">
        <StatusRow label="Current status" value={error ? "Unavailable" : settingsStatusLabel(status)} />
        <StatusRow label="Last successful scan" value={formatLastSuccessfulSync(status.lastCompleted?.finishedAt)} />
        <StatusRow
          label="Last sync with new interactions"
          value={formatLastSyncWithNewInteractions(status.lastCompletedWithImports?.finishedAt)}
        />
        <StatusRow label="New interactions from latest job" value={latestImportedCountLabel(status)} />
      </dl>
      {error ? (
        <p className="mt-3 text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
