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
      className="inline-flex items-center gap-1 rounded-control border border-border bg-surface p-1"
    >
      <button
        type="button"
        onClick={() => onChange("cards")}
        aria-pressed={value === "cards"}
        className={`flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
          value === "cards"
            ? "bg-denison-red text-surface"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        className={`flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
          value === "list"
            ? "bg-denison-red text-surface"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        <List className="h-4 w-4" strokeWidth={1.75} />
        List
      </button>
    </div>
  );
}
