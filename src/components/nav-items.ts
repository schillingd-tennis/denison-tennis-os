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

export function getPageTitle(pathname: string): string {
  return allNavItems.find((item) => item.href === pathname)?.label ?? "Denison Tennis OS";
}
