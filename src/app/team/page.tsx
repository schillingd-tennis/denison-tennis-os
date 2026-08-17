import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";

export default function TeamPage() {
  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Team" subtitle="Current team" />
      <EmptyState
        title="Team Overview"
        description="This area will eventually contain team-wide information including schedule, results, academics, development, and records."
      />
    </div>
  );
}
