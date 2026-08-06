import {
  BookOpen,
  ClipboardList,
  FlaskConical,
  Home,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const primaryNavItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Team", href: "/team", icon: Users },
  { label: "Recruiting", href: "/recruiting", icon: UserPlus },
  { label: "Operations", href: "/operations", icon: ClipboardList },
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
 * routes (e.g. `/team/[id]`) keep the parent nav item active.
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
  return allNavItems.find((item) => item.href === pathname)?.label ?? "Denison Tennis OS";
}
