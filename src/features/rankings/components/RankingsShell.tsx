"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import ModulePageShell from "@/components/ModulePageShell";

import { RANKINGS_SUBMODULES } from "../submodules";
import type { RankingsSubmoduleId } from "../types";
import ItaLogoMark from "./ItaLogoMark";

const RANKINGS_TITLE = "Rankings";
const RANKINGS_SUBTITLE = "College tennis rankings and performance";

export default function RankingsShell({
  activeId,
  children,
  actions,
}: {
  activeId: RankingsSubmoduleId;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <ModulePageShell title={RANKINGS_TITLE} subtitle={RANKINGS_SUBTITLE} actions={actions}>
      <nav
        aria-label="Rankings submodules"
        className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          role="tablist"
          className="inline-flex min-w-full gap-1 rounded-control bg-black/[0.07] p-0.5 shadow-[inset_0_0_0_1px_rgba(17,24,39,0.04)] sm:min-w-0"
        >
          {RANKINGS_SUBMODULES.map((item) => {
            const active = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={item.href}
                role="tab"
                aria-selected={active}
                className={[
                  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] px-3 text-[12px] font-medium whitespace-nowrap transition-[color,background-color,box-shadow] duration-150 sm:text-[13px]",
                  active
                    ? "bg-surface text-text-primary shadow-[0_1px_2px_rgba(17,24,39,0.08),0_0_0_1px_rgba(17,24,39,0.04)]"
                    : "text-text-secondary hover:text-text-primary",
                ].join(" ")}
              >
                {item.id === "current-ita" || item.id === "live-ita" ? (
                  <ItaLogoMark />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </ModulePageShell>
  );
}
