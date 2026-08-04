"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "./nav-items";

export default function Navigation({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-control px-3.5 py-3 text-[15px] font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-denison-red text-surface"
                  : "text-text-secondary hover:bg-sidebar-hover hover:text-surface"
              }`}
            >
              <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
