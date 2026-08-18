import EmptyState from "@/components/EmptyState";
import ModulePageShell from "@/components/ModulePageShell";

export default function TeamPage() {
  return (
    <ModulePageShell title="Team" subtitle="Current team">
      <EmptyState
        title="Team Overview"
        description="This area will eventually contain team-wide information including schedule, results, academics, development, and records."
      />
    </ModulePageShell>
  );
}
