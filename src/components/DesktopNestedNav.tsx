"use client";

import Link from "next/link";

import { isNavChildActive } from "./nav-items";
import type { NavItem } from "./nav-items";

/**
 * Shared desktop nested sidebar (Recruiting today; any parent with `children`).
 *
 * Geometry is inline so it cannot depend on Tailwind generating/keeping
 * layout utilities after client navigation.
 *
 * Parent row: 14px pad + 19px icon + 12px gap ⇒ label at 45px.
 * Child group starts under that label. Active children use the parent module's
 * full-row color; there is deliberately no colored rail or dot.
 */
const PARENT_LABEL_X = 44;
const RAIL_TO_TEXT = 18;
const CHILD_IDLE = "rgba(255, 255, 255, 0.55)";

export default function DesktopNestedNav({
  parent,
  pathname,
  onNavigate,
}: {
  parent: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const children = parent.children ?? [];
  if (children.length === 0) return null;

  return (
    <ul
      aria-label={`${parent.label} sections`}
      style={{
        position: "relative",
        marginTop: 4,
        marginBottom: 6,
        marginLeft: PARENT_LABEL_X,
        paddingLeft: RAIL_TO_TEXT,
        color: CHILD_IDLE,
        listStyle: "none",
      }}
    >
      {children.map((child) => {
        const active = isNavChildActive(pathname, child);
        return (
          <li key={`${parent.href}:${child.label}:${child.href}`} style={{ position: "relative" }}>
            <Link
              href={child.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-2 transition-colors ${active ? "font-semibold" : "font-medium hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none"}`}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                minHeight: 28,
                paddingTop: 4,
                paddingBottom: 4,
                paddingRight: 8,
                fontSize: 13,
                lineHeight: 1.25,
                color: active ? "white" : CHILD_IDLE,
                backgroundColor: active ? parent.accent : undefined,
              }}
            >
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {child.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
