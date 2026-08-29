"use client";

import { useRouter } from "next/navigation";

import { useDrawerManager } from "@/components/workspace-drawer";
import { ROLE_KEYS } from "@/features/lookups/seed";
import AddPersonFlow from "@/features/people/components/AddPersonFlow";

/** Canonical Recruit List + ADD RECRUIT button styling. */
export const ADD_RECRUIT_BUTTON_CLASS =
  "inline-flex h-11 shrink-0 items-center justify-center rounded-control bg-denison-red px-5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_18px_rgba(200,16,46,0.28)] transition-opacity hover:opacity-90";

/** Shared add-recruit drawer used by Recruit List and Recruiting Dashboard. */
export function useAddRecruitDrawer() {
  const router = useRouter();
  const { openDrawer, closeDrawer } = useDrawerManager();

  function handleCreated(personId: string, intent: "stay" | "open" = "stay") {
    closeDrawer();
    if (intent === "open") {
      router.push(`/recruiting/${personId}`);
      return;
    }
    router.refresh();
  }

  function openAddRecruitDrawer() {
    openDrawer({
      id: "recruiting-add-recruit",
      title: "Add Recruit",
      subtitle: "Recruiting",
      hideFooter: true,
      content: (
        <AddPersonFlow
          roleKey={ROLE_KEYS.recruit}
          description="Creates a Person with role Recruit and a Recruit Profile. Required: first name, last name, and class year. More recruiting details can be edited after opening the record."
          submitLabel="Create Recruit"
          onCancel={() => closeDrawer()}
          onSuccess={handleCreated}
        />
      ),
    });
  }

  return openAddRecruitDrawer;
}
