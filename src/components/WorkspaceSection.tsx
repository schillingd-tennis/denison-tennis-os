import { typeRole } from "@/components/typography";

export default function WorkspaceSection({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-card border border-border bg-surface px-5 py-5 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className={typeRole.sectionTitle}>{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
