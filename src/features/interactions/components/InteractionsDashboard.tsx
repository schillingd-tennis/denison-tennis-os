"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ModulePageShell from "@/components/ModulePageShell";
import SearchInput from "@/components/SearchInput";
import { DirectoryToolbar, MobileDirectorySearchRegion } from "@/components/mobile-dashboard";
import { useDrawerManager } from "@/components/workspace-drawer";
import type { RecruitInteraction } from "../types";
import DeleteInteractionConfirm from "./DeleteInteractionConfirm";
import InteractionForm, { type InteractionOption } from "./InteractionForm";
import InteractionList from "./InteractionList";

export default function InteractionsDashboard({ interactions, recruits, tournaments }: { interactions: RecruitInteraction[]; recruits: InteractionOption[]; tournaments: InteractionOption[] }) {
  const [query, setQuery] = useState(""); const { openDrawer, closeDrawer } = useDrawerManager();
  const router = useRouter();
  const filtered = useMemo(() => { const q=query.trim().toLowerCase(); return q ? interactions.filter(x => [x.recruitName,x.notes,x.nextSteps,x.loggedBy,x.tournamentName,x.interactionType].some(v => v?.toLowerCase().includes(q))) : interactions; }, [interactions,query]);
  function openForm(){ openDrawer({ id:"add-recruit-interaction", title:"Add Interaction", subtitle:"Recruiting · Interactions", hideFooter:true, content:<InteractionForm recruits={recruits} tournaments={tournaments} onSaved={closeDrawer} onCancel={closeDrawer}/> }); }
  function openInteraction(interaction: RecruitInteraction) {
    openDrawer({
      id: `edit-recruit-interaction-${interaction.id}`,
      title: "Interaction",
      subtitle: "Recruiting · Interactions",
      hideFooter: true,
      content: <InteractionForm key={interaction.id} interaction={interaction} recruits={recruits} tournaments={tournaments} onSaved={closeDrawer} onCancel={closeDrawer} />,
    });
  }
  function requestDelete(interaction: RecruitInteraction) {
    openDrawer({
      id: `delete-interaction-${interaction.id}`,
      title: "Delete Interaction?",
      hideFooter: true,
      content: (
        <DeleteInteractionConfirm
          interactionId={interaction.id}
          onCancel={closeDrawer}
          onSuccess={() => {
            closeDrawer();
            router.refresh();
          }}
        />
      ),
    });
  }
  return <ModulePageShell title="Interactions" subtitle="Central history of recruiting calls, texts, messages, visits, and follow-ups." actions={<button type="button" onClick={openForm} className="inline-flex h-11 items-center rounded-control bg-denison-red px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(200,16,46,0.28)]">+ Add Interaction</button>}>
    <MobileDirectorySearchRegion toolbar={<DirectoryToolbar search={<SearchInput value={query} onChange={setQuery} placeholder="Search interactions, recruits, notes, or tournaments" aria-label="Search interactions" />} views={null} filters={null} />}>
      <InteractionList interactions={filtered} onOpen={openInteraction} onDelete={requestDelete}/>
    </MobileDirectorySearchRegion>
  </ModulePageShell>;
}
