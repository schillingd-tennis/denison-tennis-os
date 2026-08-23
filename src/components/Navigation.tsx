"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const Icon = item.icon;

  const rowClass = `flex min-h-11 items-center gap-3 rounded-control px-3.5 py-3 text-[15px] font-medium transition-colors duration-150 md:min-h-0 ${
    parentActive
      ? "bg-[var(--module-accent)] text-surface shadow-[0_8px_18px_color-mix(in_srgb,var(--module-accent)_32%,transparent)]"
      : "text-text-secondary hover:bg-sidebar-hover hover:text-surface"
  }`;

  return (
    <li>
      {hasChildren ? (
        <div className={rowClass}>
          <Link
            href={item.href}
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.75} />
            <span className="min-w-0 truncate">{item.label}</span>
          </Link>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center"
            aria-hidden
          >
            <ChevronDown
              className={`h-4 w-4 ${expanded ? "" : "-rotate-90"}`}
              strokeWidth={1.75}
            />
          </span>
        </div>
      ) : (
        <Link href={item.href} onClick={onNavigate} className={rowClass}>
          <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.75} />
          {item.label}
        </Link>
      )}

      {expanded ? (
        <DesktopNestedNav parent={item} pathname={pathname} onNavigate={onNavigate} />
      ) : null}
    </li>
  );
}
