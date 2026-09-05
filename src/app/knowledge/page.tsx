import { Building2, ChevronRight } from "lucide-react";
import Link from "next/link";
import ModulePageShell from "@/components/ModulePageShell";
import { KNOWLEDGE_HOTELS_ROUTE } from "@/lib/module-routes";

export default function KnowledgePage() {
  return (
    <ModulePageShell title="Resources" subtitle="A shared library of team travel, playbooks, resources, and documentation.">
      <Link href={KNOWLEDGE_HOTELS_ROUTE} className="group flex items-center justify-between rounded-card border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(17,24,39,0.04)] transition-colors hover:border-[var(--module-accent)]/35 hover:bg-[var(--module-tint)]/30">
        <span className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-card bg-[var(--module-tint)] text-[var(--module-accent)]"><Building2 className="h-5 w-5"/></span><span><strong className="block text-base text-text-primary">Hotels</strong><span className="mt-1 block text-sm text-text-secondary">Search and maintain team travel hotel experience.</span></span></span><ChevronRight className="h-5 w-5 text-text-secondary transition-transform group-hover:translate-x-0.5"/>
      </Link>
    </ModulePageShell>
  );
}
