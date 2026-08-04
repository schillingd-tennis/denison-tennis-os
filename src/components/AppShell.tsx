"use client";

import { useState } from "react";

import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-app-background">
      <Sidebar
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-h-screen flex-col md:pl-[var(--sidebar-width)]">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-6 py-10 md:px-10 lg:px-16">{children}</main>
      </div>
    </div>
  );
}
