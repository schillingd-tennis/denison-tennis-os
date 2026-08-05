"use client";

import type { RoleFilter } from "@/features/people/utils";

const options: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "players", label: "Players" },
  { value: "coaches", label: "Coaches" },
  { value: "alumni", label: "Alumni" },
];

export default function RoleFilterControl({
  value,
  onChange,
}: {
  value: RoleFilter;
  onChange: (value: RoleFilter) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter by role"
      className="inline-flex h-9 items-center gap-0.5 rounded-control border border-border bg-surface p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`flex h-7 items-center rounded-control px-3 text-xs font-medium transition-colors duration-150 ${
            value === option.value
              ? "bg-denison-red text-surface"
              : "text-text-secondary hover:bg-app-background hover:text-text-primary"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
