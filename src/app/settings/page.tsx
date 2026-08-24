import Link from "next/link";
import { ChevronRight, TerminalSquare } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import AppleMessagesSettingsCard from "@/features/interactions/appleMessagesSync/AppleMessagesSettingsCard";
import { getAppleMessagesSyncStatusAction } from "@/features/interactions/appleMessagesSync/actions";
import { emptySyncStatus } from "@/features/interactions/appleMessagesSync/settingsStatus";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const loaded = await getAppleMessagesSyncStatusAction();
  const initialStatus = loaded.ok ? loaded.status : emptySyncStatus();
  const initialError = loaded.ok ? null : loaded.error;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Settings"
        subtitle="Workspace preferences and developer tools for Denison Tennis OS."
      />

      <AppleMessagesSettingsCard
        initialStatus={initialStatus}
        initialError={initialError}
        signedIn={loaded.ok}
      />

      <section>
        <h2 className="text-sm font-semibold tracking-wide text-text-secondary uppercase">
          Developer
        </h2>
        <Link
          href="/settings/developer"
          className="mt-3 flex items-center justify-between gap-4 rounded-card border border-[var(--module-border)] bg-surface px-5 py-4 shadow-[0_8px_24px_rgba(17,24,39,0.04)] transition-colors hover:border-[var(--module-accent)]/40 hover:bg-[var(--module-tint)]/50"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-control bg-app-background text-text-secondary">
              <TerminalSquare className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <p className="text-sm font-semibold text-text-primary">Developer</p>
              <p className="mt-1 text-sm text-text-secondary">
                Environment banner, database connection, People counts, and local Supabase utilities.
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={2} />
        </Link>
      </section>
    </div>
  );
}
