"use client";

import { LayoutGrid, List, type LucideIcon } from "lucide-react";

import { SegmentedControl } from "@/components/toolbar";

export type ViewMode = "cards" | "list";

const defaultOptions = [
  { value: "cards" as const, label: "Cards", icon: LayoutGrid },
  { value: "list" as const, label: "List", icon: List },
];

/**
 * Cards / List view toggle — standard tertiary toolbar control.
 * Pass `options` to extend the segments (Recruiting: Cards | List | Rank).
 * Team continues to use the default two-segment control.
 */
export default function ViewToggle<T extends string = ViewMode>({
  value,
  onChange,
  options,
  ariaLabel = "Change view",
}: {
  value: T;
  onChange: (value: T) => void;
  options?: readonly { value: T; label: string; icon?: LucideIcon }[];
  ariaLabel?: string;
}) {
  const resolved = (options ?? defaultOptions) as readonly {
    value: T;
    label: string;
    icon?: LucideIcon;
  }[];

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={[...resolved]}
      ariaLabel={ariaLabel}
      equalWidth
    />
  );
}
