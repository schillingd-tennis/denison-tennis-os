"use client";

import Navigation from "./Navigation";
import { primaryNavItems, settingsNavItem } from "./nav-items";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar">
      <div className="flex shrink-0 items-center gap-3 px-6 pt-9 pb-7">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-denison-red text-base font-semibold text-surface">
          D
        </div>
        <div>
          <p className="text-[15px] font-semibold leading-tight tracking-wide text-surface">
            DENISON
          </p>
          <p className="text-xs font-semibold tracking-[0.2em] text-text-secondary">
            <span className="text-denison-red">TENNIS</span> OS
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4">
        <Navigation items={primaryNavItems} onNavigate={onNavigate} />
      </nav>

      <div className="shrink-0 border-t border-border/10 px-4 py-5">
        <Navigation items={[settingsNavItem]} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <aside
        data-app-sidebar-desktop=""
        className="fixed inset-y-0 left-0 z-30 hidden md:block"
      >
        <SidebarContent />
      </aside>

      {/*
        When closed, every layer must set pointer-events-none. A parent-only
        none still lets children (default auto) intercept taps — including the
        opacity-0 full-screen backdrop over the hamburger.
      */}
      <div
        data-app-sidebar-mobile=""
        className={`fixed inset-0 z-40 md:hidden ${
          isOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!isOpen}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            isOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={onClose}
        />
        <aside
          className={`absolute inset-y-0 left-0 transition-transform duration-200 ${
            isOpen
              ? "pointer-events-auto translate-x-0"
              : "pointer-events-none -translate-x-full"
          }`}
        >
          <SidebarContent onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
