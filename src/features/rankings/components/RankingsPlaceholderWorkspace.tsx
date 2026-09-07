import RankingsShell from "./RankingsShell";
import ItaLogoMark from "./ItaLogoMark";
import type { RankingsSubmoduleId } from "../types";
import { rankingsSubmoduleById } from "../submodules";

export default function RankingsPlaceholderWorkspace({
  activeId,
  description,
}: {
  activeId: Exclude<RankingsSubmoduleId, "current-ita">;
  description: string;
}) {
  const submodule = rankingsSubmoduleById(activeId);
  return (
    <RankingsShell activeId={activeId}>
      <div className="relative overflow-hidden rounded-card border border-[var(--module-border)] bg-[var(--module-tint)] px-6 py-16 text-center">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5 bg-[var(--module-accent)]"
        />
        <div className="flex items-center justify-center gap-2.5">
          {activeId === "live-ita" ? <ItaLogoMark size="heading" /> : null}
          <p className="text-base font-medium text-text-primary">{submodule.label}</p>
        </div>
        <p className="mt-2 text-sm font-semibold text-text-primary">Coming soon</p>
        <p className="mx-auto mt-2.5 max-w-sm text-sm text-text-secondary">{description}</p>
      </div>
    </RankingsShell>
  );
}
