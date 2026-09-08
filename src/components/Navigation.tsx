"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties } from "react";

import DesktopNestedNav from "./DesktopNestedNav";
import { getNestedNavState } from "./nestedNavState";
import type { NavItem } from "./nav-items";

export default function Navigation({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "";

  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <NavEntry
          key={item.href}
          item={item}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  );
}

function NavEntry({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasChildren = Boolean(item.children?.length);
  const { parentActive, expanded } = getNestedNavState(pathname, item);
  const [manuallyExpanded, setManuallyExpanded] = useState(expanded);
  const isExpanded = parentActive || manuallyExpanded;
  const Icon = item.icon;

  const rowClass = `flex min-h-11 items-center gap-3 rounded-control px-3.5 py-3 text-[15px] font-medium transition-[background-color,color,box-shadow] duration-150 md:min-h-0 ${
    parentActive
      ? "bg-[var(--nav-accent)] text-surface shadow-[0_8px_18px_color-mix(in_srgb,var(--nav-accent)_32%,transparent)]"
      : "text-text-secondary hover:bg-[var(--nav-accent)] hover:text-surface focus-visible:bg-[var(--nav-accent)] focus-visible:text-surface focus-visible:outline-none"
  }`;
  const rowStyle = { "--nav-accent": item.accent } as CSSProperties;

  return (
    <li>
      {hasChildren ? (
        <button
          type="button"
          className={`${rowClass} w-full text-left`}
          style={rowStyle}
          aria-expanded={isExpanded}
          aria-controls={`sidebar-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          onClick={() => setManuallyExpanded((value) => !value)}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <Icon className="h-[19px] w-[19px] shrink-0 text-white" strokeWidth={1.75} />
            <span className="min-w-0 truncate">{item.label}</span>
          </span>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center"
            aria-hidden
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-150 ${isExpanded ? "" : "-rotate-90"}`}
              strokeWidth={1.75}
            />
          </span>
        </button>
      ) : (
        <Link href={item.href} onClick={onNavigate} className={rowClass} style={rowStyle}>
          <Icon className="h-[19px] w-[19px] shrink-0 text-white" strokeWidth={1.75} />
          {item.label}
        </Link>
      )}

      {isExpanded ? (
        <div id={`sidebar-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
          <DesktopNestedNav parent={item} pathname={pathname} onNavigate={onNavigate} />
        </div>
      ) : null}
    </li>
  );
}
