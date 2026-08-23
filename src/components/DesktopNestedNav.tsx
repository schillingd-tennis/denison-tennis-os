"use client";

import Link from "next/link";

import { isNavChildActive } from "./nav-items";
import type { NavItem } from "./nav-items";

/**
 * Shared desktop nested sidebar (Recruiting today; any parent with `children`).
 *
 * Geometry is inline so it cannot depend on Tailwind generating/keeping
 * `ml-*` / `absolute` / `bg-white/25` after client navigation.
 *
 * Parent row: 14px pad + 19px icon + 12px gap ⇒ label at 45px.
 * Child group starts at 44px (under that label). Rail at 0 of the group.
 * Child text is 18px to the right of the rail. Active dot is centered on the rail.
 */
const PARENT_LABEL_X = 44;
const RAIL_TO_TEXT = 18;
const DOT = 7;
const CHILD_IDLE = "rgba(255, 255, 255, 0.55)";
const CHILD_ACTIVE = "#C8102E";
const RAIL = "rgba(255, 255, 255, 0.28)";

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
      <li
        aria-hidden
        style={{
          position: "absolute",
          top: 6,
          bottom: 6,
          left: 0,
          width: 1,
          backgroundColor: RAIL,
          pointerEvents: "none",
        }}
      />
      {children.map((child) => {
        const active = isNavChildActive(pathname, child);
        return (
          <li key={`${parent.href}:${child.label}:${child.href}`} style={{ position: "relative" }}>
            <Link
              href={child.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={active ? "font-semibold" : "font-medium"}
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
                color: active ? CHILD_ACTIVE : CHILD_IDLE,
              }}
            >
              {active ? (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: -RAIL_TO_TEXT,
                    width: DOT,
                    height: DOT,
                    borderRadius: 999,
                    backgroundColor: CHILD_ACTIVE,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ) : null}
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
