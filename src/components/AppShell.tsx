"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  CommandPalette,
  CommandPaletteProvider,
} from "@/components/command-palette";

import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // /login renders its own centered, chrome-free layout (BP-016 Phase 1) —
  // it must stay reachable and legible before a session exists.
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <CommandPaletteProvider>
      <div className="min-h-screen overflow-x-hidden bg-app-background">
        <Sidebar
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        <div className="flex min-h-screen flex-col md:pl-[var(--sidebar-width)]">
          <Header onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 px-6 py-10 md:px-10 lg:px-16">{children}</main>
        </div>

        <CommandPalette />
      </div>
    </CommandPaletteProvider>
  );
}
