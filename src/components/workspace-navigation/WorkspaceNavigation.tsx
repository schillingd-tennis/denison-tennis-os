import { ChevronRight } from "lucide-react";

import { typeRole } from "@/components/typography";

import type { WorkspaceNavItem } from "./types";

/**
 * BP-035A / BP-035C / BP-035D — Compact workspace navigation panel.
 *
 * Settings-style rows select the Adaptive Workspace. Not a drawer launcher.
 * Reusable across Person, Recruiting, Operations, Research, and future modules.
 *
 * When `showTitle` is false, only the list pane renders so a parent can place
 * the section title above a two-column layout (nav + Adaptive Workspace).
 */
export default function WorkspaceNavigation({
  title = "Workspaces",
  showTitle = true,
  items,
  activeId = null,
  onSelect,
  className,
}: {
  title?: string;
  /** When false, omit the section heading so pane tops can align with a sibling. */
  showTitle?: boolean;
  items: WorkspaceNavItem[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const list = (
    <div className="overflow-hidden rounded-card border border-border/70 bg-surface">
      <ul className="divide-y divide-border/35" role="listbox" aria-label={title}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeId;
          return (
            <li key={item.id} role="option" aria-selected={active}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={`group flex w-full cursor-pointer items-center gap-3 border-l-[3px] px-3.5 py-2 text-left transition-[background-color,border-color,box-shadow,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-denison-red/35 ${
                  active
                    ? "border-denison-red bg-app-background"
                    : "border-transparent hover:bg-app-background hover:shadow-[inset_0_0_0_1px_rgba(17,24,39,0.03)]"
                }`}
              >
                <span
                  className={`inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-control transition-colors duration-150 ${
                    active
                      ? "bg-denison-red/10 text-denison-red"
                      : "bg-app-background text-text-secondary group-hover:text-text-primary"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium tracking-tight text-text-primary">
                    {item.title}
                  </span>
                  {item.lines.length > 0 ? (
                    <span className="mt-px block space-y-px">
                      {item.lines.map((line) => (
                        <span
                          key={line}
                          className="block truncate text-[12.5px] leading-snug text-text-secondary"
                        >
                          {line}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>

                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                    active
                      ? "text-denison-red/70"
                      : "text-text-secondary/40 group-hover:text-text-secondary/70"
                  }`}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  if (!showTitle) {
    return (
      <section className={className} aria-label={title}>
        {list}
      </section>
    );
  }

  return (
    <section className={className} aria-label={title}>
      <h2 className={typeRole.sectionTitle}>{title}</h2>
      <div className="mt-2.5">{list}</div>
    </section>
  );
}
