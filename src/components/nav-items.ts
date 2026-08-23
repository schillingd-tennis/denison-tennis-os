import {
  BookOpen,
  ClipboardList,
  FlaskConical,
  HandCoins,
  Home,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  PLAYERS_COACHES_ROUTE,
  RECRUITING_LIST_ROUTE,
  RECRUITING_ROUTE,
  RECRUITING_TOURNAMENTS_ROUTE,
  RECRUITING_INTERACTIONS_ROUTE,
  TEAM_ROUTE,
} from "@/lib/module-routes";

export type NavChildItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  /** Match the pathname exactly (module index). Prefix matches go to longer siblings. */
  exact?: boolean;
};

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavChildItem[];
};

export const primaryNavItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Team", href: PLAYERS_COACHES_ROUTE, icon: Users },
  { label: "Team Operations", href: "/operations", icon: ClipboardList },
  {
    label: "Recruiting",
    href: RECRUITING_ROUTE,
    icon: UserPlus,
    children: [
      { label: "Dashboard", href: RECRUITING_ROUTE, exact: true },
      { label: "Recruit List", href: RECRUITING_LIST_ROUTE },
      { label: "Tournaments", href: RECRUITING_TOURNAMENTS_ROUTE },
      { label: "Interactions", href: RECRUITING_INTERACTIONS_ROUTE },
    ],
  },
  { label: "Fundraising", href: "/fundraising", icon: HandCoins },
  { label: "Research Lab", href: "/research", icon: FlaskConical },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
];

export const settingsNavItem: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
};

const allNavItems: NavItem[] = [...primaryNavItems, settingsNavItem];

/** Strip a trailing slash so client navigations and direct loads match the same. */
export function normalizeNavPathname(pathname: string): string {
  if (!pathname || pathname === "/") return pathname || "/";
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * Sidebar active state (BP-031C): prefix match for module roots so child
 * routes (e.g. `/players-coaches/[id]`) keep the parent nav item active.
 * Home (`/`) stays exact-only so it does not match every path.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  const path = normalizeNavPathname(pathname);
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

export function isNavChildActive(pathname: string, child: NavChildItem): boolean {
  const path = normalizeNavPathname(pathname);
  if (child.exact) return path === child.href;
  return path === child.href || path.startsWith(`${child.href}/`);
}

export function getPageTitle(pathname: string): string {
  if (pathname === RECRUITING_INTERACTIONS_ROUTE || pathname.startsWith(`${RECRUITING_INTERACTIONS_ROUTE}/`)) {
    return "Interactions";
  }
  if (pathname === "/settings/developer" || pathname.startsWith("/settings/developer/")) {
    return "Developer";
  }
  if (pathname === RECRUITING_TOURNAMENTS_ROUTE || pathname.startsWith(`${RECRUITING_TOURNAMENTS_ROUTE}/`)) {
    return "Tournaments";
  }
  if (pathname === RECRUITING_LIST_ROUTE || pathname.startsWith(`${RECRUITING_LIST_ROUTE}/`)) {
    return "Recruit List";
  }
  if (pathname === RECRUITING_ROUTE) {
    return "Dashboard";
  }
  if (pathname.startsWith("/recruiting")) {
    return "Recruiting";
  }
  if (pathname.startsWith(PLAYERS_COACHES_ROUTE)) {
    return "Team";
  }
  if (pathname === TEAM_ROUTE || pathname.startsWith(`${TEAM_ROUTE}/`)) {
    return "Team";
  }
  if (pathname.startsWith("/operations")) {
    return "Team Operations";
  }
  if (pathname.startsWith("/fundraising")) {
    return "Fundraising";
  }
  return allNavItems.find((item) => item.href === pathname)?.label ?? "Denison Tennis OS";
}
