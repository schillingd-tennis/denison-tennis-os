import Link from "next/link";

export type RecruitingCommandTab = "overview" | "results" | "follow-ups" | "monitoring";

const TABS: Array<{ value: RecruitingCommandTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "results", label: "Live Results" },
  { value: "follow-ups", label: "Visits & Follow-ups" },
  { value: "monitoring", label: "Import & Monitoring" },
];

export default function RecruitingCommandTabs({ active }: { active: RecruitingCommandTab }) {
  return (
    <nav
      aria-label="Recruiting command center sections"
      className="flex gap-1 overflow-x-auto rounded-card border border-border bg-surface p-1 shadow-sm"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value === "overview" ? "/recruiting" : `/recruiting?tab=${tab.value}`}
          aria-current={active === tab.value ? "page" : undefined}
          className={`flex min-h-9 shrink-0 items-center rounded-control px-4 text-xs font-semibold transition-colors ${
            active === tab.value
              ? "bg-[var(--module-accent)] text-white"
              : "text-text-secondary hover:bg-app-background hover:text-text-primary"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
