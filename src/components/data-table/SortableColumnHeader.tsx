import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { typeRole } from "@/components/typography";

import type { SortDirection } from "./types";

const ariaSortValue: Record<"asc" | "desc" | "none", "ascending" | "descending" | "none"> = {
  asc: "ascending",
  desc: "descending",
  none: "none",
};

export default function SortableColumnHeader({
  label,
  align = "left",
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  align?: "left" | "right";
  /** `null` when this column is not the active sort. */
  sortDirection: SortDirection | null;
  onSort: () => void;
  /** Extra classes (e.g. sticky leading column from `stickyLeadingColumn`). */
  className?: string;
}) {
  const Icon = sortDirection === "asc" ? ArrowUp : sortDirection === "desc" ? ArrowDown : ChevronsUpDown;
  const isActive = sortDirection !== null;

  return (
    <th
      scope="col"
      aria-sort={ariaSortValue[sortDirection ?? "none"]}
      className={`px-4 py-3 ${typeRole.tableHeader} ${align === "right" ? "text-right" : "text-left"}${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        onClick={onSort}
        className={`inline-flex items-center gap-1 rounded-control transition-colors duration-150 hover:text-text-primary focus-visible:ring-2 focus-visible:ring-denison-red focus-visible:ring-offset-2 focus-visible:outline-none ${
          align === "right" ? "flex-row-reverse" : ""
        } ${isActive ? "text-text-primary" : "text-text-secondary"}`}
      >
        {label}
        <Icon
          className={`h-3.5 w-3.5 ${isActive ? "text-denison-red" : "text-text-secondary/60"}`}
          strokeWidth={2}
        />
      </button>
    </th>
  );
}
