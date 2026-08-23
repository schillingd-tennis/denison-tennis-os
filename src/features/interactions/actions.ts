"use server";

import { revalidatePath } from "next/cache";

import { readInteractionFormData } from "./formData";
import {
  createRecruitInteraction,
  deleteRecruitInteraction,
  getRecruitInteraction,
  updateRecruitInteraction,
} from "./repository";

function revalidateInteractionPaths(recruitPersonId: string, previousRecruitPersonId?: string) {
  revalidatePath("/recruiting/interactions");
  revalidatePath(`/recruiting/${recruitPersonId}`);
  if (previousRecruitPersonId && previousRecruitPersonId !== recruitPersonId) {
    revalidatePath(`/recruiting/${previousRecruitPersonId}`);
  }
}

export async function addRecruitInteractionAction(formData: FormData) {
  const { input } = readInteractionFormData(formData);
  const result = await createRecruitInteraction(input);
  revalidateInteractionPaths(result.recruitPersonId);
  return result;
}

export async function updateRecruitInteractionAction(formData: FormData) {
  const { id, input } = readInteractionFormData(formData);
  if (!id) throw new Error("Interaction id is required.");
  const existing = await getRecruitInteraction(id);
  if (!existing) throw new Error("Interaction not found.");
  const result = await updateRecruitInteraction(id, input);
  revalidateInteractionPaths(result.recruitPersonId, existing.recruitPersonId);
  return result;
}

export async function deleteRecruitInteractionAction(interactionId: string) {
  const id = interactionId.trim();
  if (!id) throw new Error("Interaction id is required.");
  const existing = await getRecruitInteraction(id);
  if (!existing) throw new Error("Interaction not found.");
  await deleteRecruitInteraction(id);
  revalidateInteractionPaths(existing.recruitPersonId);
  return existing;
}
