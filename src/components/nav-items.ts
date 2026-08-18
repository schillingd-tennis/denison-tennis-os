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

import { PLAYERS_COACHES_ROUTE, TEAM_ROUTE } from "@/lib/module-routes";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const primaryNavItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Team", href: PLAYERS_COACHES_ROUTE, icon: Users },
  { label: "Team Operations", href: "/operations", icon: ClipboardList },
  { label: "Recruiting", href: "/recruiting", icon: UserPlus },
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

/**
 * Sidebar active state (BP-031C): prefix match for module roots so child
 * routes (e.g. `/players-coaches/[id]`) keep the parent nav item active.
 * Home (`/`) stays exact-only so it does not match every path.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getPageTitle(pathname: string): string {
  if (pathname === "/settings/developer" || pathname.startsWith("/settings/developer/")) {
    return "Developer";
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
