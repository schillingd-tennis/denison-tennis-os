"use client";

import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "cards" | "list";

export default function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Change view"
      className="inline-flex h-9 items-center gap-0.5 rounded-control border border-border bg-surface p-0.5"
    >
      <button
        type="button"
        onClick={() => onChange("cards")}
        aria-pressed={value === "cards"}
        className={`flex h-7 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium transition-colors duration-150 ${
          value === "cards"
            ? "bg-denison-red text-surface"
            : "text-text-secondary hover:bg-app-background hover:text-text-primary"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} />
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        className={`flex h-7 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium transition-colors duration-150 ${
          value === "list"
            ? "bg-denison-red text-surface"
            : "text-text-secondary hover:bg-app-background hover:text-text-primary"
        }`}
      >
        <List className="h-3.5 w-3.5" strokeWidth={1.75} />
        List
      </button>
    </div>
  );
}
