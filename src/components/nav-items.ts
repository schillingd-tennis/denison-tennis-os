import {
  BookOpen,
  ClipboardList,
  FlaskConical,
  HandCoins,
  Home,
  Settings,
  Trophy,
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
  RECRUITING_LOG_ROUTE,
  RECRUITING_TODAY_BETA_ROUTE,
  RECRUITING_AGENCIES_ROUTE,
  TEAM_OPERATIONS_ROUTE,
  TEAM_OPERATIONS_INTRA_SQUAD_ROUTE,
  TEAM_OPERATIONS_PRACTICE_ROUTE,
  TEAM_OPERATIONS_SCHEDULE_ROUTE,
  TEAM_OPERATIONS_SCOUTING_ROUTE,
  TEAM_ROUTE,
  KNOWLEDGE_ROUTE,
  KNOWLEDGE_HOTELS_ROUTE,
  RANKINGS_ROUTE,
  RANKINGS_CURRENT_ITA_ROUTE,
  RANKINGS_LIVE_ITA_ROUTE,
  RANKINGS_CURRENT_NPI_ROUTE,
  RANKINGS_LIVE_NPI_ROUTE,
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
  accent: string;
  children?: NavChildItem[];
};

export const primaryNavItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home, accent: "#c8102e" },
  { label: "Team", href: PLAYERS_COACHES_ROUTE, icon: Users, accent: "#64748b" },
  { label: "Team Operations", href: TEAM_OPERATIONS_ROUTE, icon: ClipboardList, accent: "#16a34a", children: [
      { label: "Schedule", href: TEAM_OPERATIONS_SCHEDULE_ROUTE },
      { label: "Practice", href: TEAM_OPERATIONS_PRACTICE_ROUTE },
      { label: "Intra Squad", href: TEAM_OPERATIONS_INTRA_SQUAD_ROUTE },
      { label: "Scouting", href: TEAM_OPERATIONS_SCOUTING_ROUTE },
    ] },
  {
    label: "Recruiting",
    href: RECRUITING_ROUTE,
    icon: UserPlus,
    accent: "#c8102e",
    children: [
      { label: "Today Beta", href: RECRUITING_TODAY_BETA_ROUTE },
      { label: "Dashboard", href: RECRUITING_ROUTE, exact: true },
      { label: "Recruits", href: RECRUITING_LIST_ROUTE },
      { label: "Tournaments", href: RECRUITING_TOURNAMENTS_ROUTE },
      { label: "Agencies", href: RECRUITING_AGENCIES_ROUTE },
      { label: "Interactions", href: RECRUITING_INTERACTIONS_ROUTE },
      { label: "Log", href: RECRUITING_LOG_ROUTE },
    ],
  },
  {
    label: "Rankings",
    href: RANKINGS_ROUTE,
    icon: Trophy,
    accent: "#7c3aed",
  },
  { label: "Fundraising", href: "/fundraising", icon: HandCoins, accent: "#166534" },
  { label: "Research Lab", href: "/research", icon: FlaskConical, accent: "#3f3f46" },
  { label: "Resources", href: KNOWLEDGE_ROUTE, icon: BookOpen, accent: "#ff3c00", children: [
      { label: "Hotels", href: KNOWLEDGE_HOTELS_ROUTE },
    ] },
];

export const settingsNavItem: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
  accent: "#475569",
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
  if (pathname === RECRUITING_LOG_ROUTE || pathname.startsWith(`${RECRUITING_LOG_ROUTE}/`)) {
    return "Log";
  }
  if (pathname === "/settings/developer" || pathname.startsWith("/settings/developer/")) {
    return "Developer";
  }
  if (pathname === RECRUITING_TOURNAMENTS_ROUTE || pathname.startsWith(`${RECRUITING_TOURNAMENTS_ROUTE}/`)) {
    return "Tournaments";
  }
  if (pathname === RECRUITING_LIST_ROUTE || pathname.startsWith(`${RECRUITING_LIST_ROUTE}/`)) {
    return "Recruits";
  }
  if (pathname === RECRUITING_TODAY_BETA_ROUTE || pathname.startsWith(`${RECRUITING_TODAY_BETA_ROUTE}/`)) {
    return "Today Beta";
  }
  if (pathname === RECRUITING_AGENCIES_ROUTE || pathname.startsWith(`${RECRUITING_AGENCIES_ROUTE}/`)) {
    return "Agencies";
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
  if (pathname === TEAM_OPERATIONS_SCHEDULE_ROUTE || pathname.startsWith(`${TEAM_OPERATIONS_SCHEDULE_ROUTE}/`)) {
    return "Schedule";
  }
  if (pathname === TEAM_OPERATIONS_INTRA_SQUAD_ROUTE || pathname.startsWith(`${TEAM_OPERATIONS_INTRA_SQUAD_ROUTE}/`)) {
    return "Intra Squad";
  }
  if (pathname === TEAM_OPERATIONS_PRACTICE_ROUTE || pathname.startsWith(`${TEAM_OPERATIONS_PRACTICE_ROUTE}/`)) {
    return "Practice";
  }
  if (pathname === TEAM_OPERATIONS_SCOUTING_ROUTE || pathname.startsWith(`${TEAM_OPERATIONS_SCOUTING_ROUTE}/`)) {
    return "Scouting";
  }
  if (pathname.startsWith("/team-operations") || pathname.startsWith("/operations")) {
    return "Team Operations";
  }
  if (pathname === RANKINGS_CURRENT_ITA_ROUTE || pathname.startsWith(`${RANKINGS_CURRENT_ITA_ROUTE}/`)) {
    return "Current ITA Rankings";
  }
  if (pathname === RANKINGS_LIVE_ITA_ROUTE || pathname.startsWith(`${RANKINGS_LIVE_ITA_ROUTE}/`)) {
    return "Live ITA Rankings";
  }
  if (pathname === RANKINGS_CURRENT_NPI_ROUTE || pathname.startsWith(`${RANKINGS_CURRENT_NPI_ROUTE}/`)) {
    return "Current NPI Rankings";
  }
  if (pathname === RANKINGS_LIVE_NPI_ROUTE || pathname.startsWith(`${RANKINGS_LIVE_NPI_ROUTE}/`)) {
    return "Live NPI Rankings";
  }
  if (pathname.startsWith(RANKINGS_ROUTE)) {
    return "Rankings";
  }
  if (pathname.startsWith("/fundraising")) {
    return "Fundraising";
  }
  if (pathname === KNOWLEDGE_HOTELS_ROUTE || pathname.startsWith(`${KNOWLEDGE_HOTELS_ROUTE}/`)) {
    return "Hotels";
  }
  return allNavItems.find((item) => item.href === pathname)?.label ?? "Denison Tennis OS";
}
