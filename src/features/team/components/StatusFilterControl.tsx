"use client";

import type { StatusFilter } from "@/features/people/utils";

const options: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "current", label: "Current" },
  { value: "alumni", label: "Alumni" },
];

export default function StatusFilterControl({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter by status"
      className="inline-flex items-center gap-1 rounded-control border border-border bg-surface p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.value
              ? "bg-denison-red text-surface"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
