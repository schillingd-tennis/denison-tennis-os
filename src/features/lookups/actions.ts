"use server";

import { listRoles, listStatuses, LookupRepositoryError } from "./repository";
import type { LookupRecord } from "./types";

export async function getRolesAction(): Promise<LookupRecord[]> {
  try {
    return await listRoles();
  } catch (error) {
    if (error instanceof LookupRepositoryError) {
      console.error(`[getRolesAction] ${error.message}`);
    }
    return [];
  }
}

export async function getStatusesAction(): Promise<LookupRecord[]> {
  try {
    return await listStatuses();
  } catch (error) {
    if (error instanceof LookupRepositoryError) {
      console.error(`[getStatusesAction] ${error.message}`);
    }
    return [];
  }
}
