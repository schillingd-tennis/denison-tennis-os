"use server";

/**
 * Person lifecycle Server Actions (BP-041 / BP-042 / BP-045).
 *
 * createPlayerAction — Team directory Add Player (role=player, status=current).
 * createCoachAction — Team directory Add Coach (role=coach, status=current).
 * createRecruitAction — Recruiting directory Add Recruit (role=recruit + RecruitProfile).
 * deletePersonAction — hard-delete a Person record (cascades relationship edges
 * and Recruit Profile).
 */

import { revalidatePath } from "next/cache";

import { ROLE_KEYS, STATUS_KEYS } from "@/features/lookups/seed";
import { createRecruitProfile } from "@/features/recruiting/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  createPerson,
  deletePerson,
  getPersonById,
  PeopleRepositoryError,
} from "./repository";
import {
  COACH_DESIGNATIONS,
  type CoachDesignation,
  type PlayerStatus,
} from "./types";

export type CreatePlayerActionInput = {
  firstName: string;
  lastName: string;
  classYear?: number;
  playerStatus?: PlayerStatus;
};

export type CreatePersonLifecycleResult =
  | { success: true; personId: string }
  | { success: false; error: string };

export type CreatePlayerActionResult = CreatePersonLifecycleResult;

export type CreateCoachActionInput = {
  firstName: string;
  lastName: string;
  /** Stored on production_people.title — drives Team Role display. */
  title: CoachDesignation;
};

export type CreateCoachActionResult = CreatePersonLifecycleResult;

export type CreateRecruitActionInput = {
  firstName: string;
  lastName: string;
  /** HS recruiting class — RecruitProfile.recruitClassYear, not Person.classYear. */
  recruitClassYear?: number;
};

export type CreateRecruitActionResult = CreatePersonLifecycleResult;

export type DeletePersonActionResult =
  | { success: true }
  | { success: false; error: string };

const PLAYER_STATUS_VALUES = new Set<string>([
  "active",
  "injured",
  "inactive",
  "graduated",
]);

async function requireAuthenticatedUser(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Your session has expired. Please sign in again to save changes.",
    };
  }

  return { ok: true };
}

function normalizeRequiredName(
  value: string | undefined,
  field: string,
): string | { error: string } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { error: `${field} is required.` };
  return trimmed;
}

/** Create a Player Person for the Team directory (BP-041). */
export async function createPlayerAction(
  input: CreatePlayerActionInput,
): Promise<CreatePlayerActionResult> {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const firstName = normalizeRequiredName(input.firstName, "First name");
  if (typeof firstName === "object") return { success: false, error: firstName.error };

  const lastName = normalizeRequiredName(input.lastName, "Last name");
  if (typeof lastName === "object") return { success: false, error: lastName.error };

  let classYear: number | undefined;
  if (input.classYear !== undefined && input.classYear !== null) {
    if (!Number.isInteger(input.classYear) || input.classYear < 1900 || input.classYear > 2200) {
      return { success: false, error: "Class year must be a valid year." };
    }
    classYear = input.classYear;
  }

  let playerStatus: PlayerStatus | undefined;
  if (input.playerStatus) {
    if (!PLAYER_STATUS_VALUES.has(input.playerStatus)) {
      return { success: false, error: "Player status is invalid." };
    }
    playerStatus = input.playerStatus;
  }

  try {
    const person = await createPerson({
      firstName,
      lastName,
      roleKey: ROLE_KEYS.player,
      statusKey: STATUS_KEYS.current,
      classYear,
      playerStatus,
    });

    revalidatePath("/team");
    revalidatePath(`/team/${person.id}`);
    revalidatePath("/people");
    // Return only the id — avoid serializing the full Person graph to the client.
    return { success: true, personId: person.id };
  } catch (error) {
    if (error instanceof PeopleRepositoryError) {
      console.error(`[createPlayerAction] ${error.message}`);
    } else {
      console.error("[createPlayerAction] Unexpected error", error);
    }
    return {
      success: false,
      error: "We couldn't create the player. Please try again.",
    };
  }
}

/** Create a Coach Person for the Team directory (BP-042). */
export async function createCoachAction(
  input: CreateCoachActionInput,
): Promise<CreateCoachActionResult> {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const firstName = normalizeRequiredName(input.firstName, "First name");
  if (typeof firstName === "object") return { success: false, error: firstName.error };

  const lastName = normalizeRequiredName(input.lastName, "Last name");
  if (typeof lastName === "object") return { success: false, error: lastName.error };

  const titleTrimmed = input.title?.trim() ?? "";
  if (!titleTrimmed) {
    return { success: false, error: "Coach designation is required." };
  }
  if (!(COACH_DESIGNATIONS as readonly string[]).includes(titleTrimmed)) {
    return { success: false, error: "Coach designation is invalid." };
  }
  const title = titleTrimmed as CoachDesignation;

  try {
    const person = await createPerson({
      firstName,
      lastName,
      roleKey: ROLE_KEYS.coach,
      statusKey: STATUS_KEYS.current,
      title,
    });

    revalidatePath("/team");
    revalidatePath(`/team/${person.id}`);
    revalidatePath("/people");
    revalidatePath("/recruiting");
    return { success: true, personId: person.id };
  } catch (error) {
    if (error instanceof PeopleRepositoryError) {
      console.error(`[createCoachAction] ${error.message}`);
    } else {
      console.error("[createCoachAction] Unexpected error", error);
    }
    return {
      success: false,
      error: "We couldn't create the coach. Please try again.",
    };
  }
}

/** Create a Recruit Person plus Recruit Profile (BP-045). */
export async function createRecruitAction(
  input: CreateRecruitActionInput,
): Promise<CreateRecruitActionResult> {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const firstName = normalizeRequiredName(input.firstName, "First name");
  if (typeof firstName === "object") return { success: false, error: firstName.error };

  const lastName = normalizeRequiredName(input.lastName, "Last name");
  if (typeof lastName === "object") return { success: false, error: lastName.error };

  let recruitClassYear: number | undefined;
  if (input.recruitClassYear !== undefined && input.recruitClassYear !== null) {
    if (
      !Number.isInteger(input.recruitClassYear) ||
      input.recruitClassYear < 1900 ||
      input.recruitClassYear > 2200
    ) {
      return { success: false, error: "Recruit class year must be a valid year." };
    }
    recruitClassYear = input.recruitClassYear;
  }

  try {
    const person = await createPerson({
      firstName,
      lastName,
      roleKey: ROLE_KEYS.recruit,
      statusKey: STATUS_KEYS.current,
    });

    await createRecruitProfile({
      personId: person.id,
      recruitClassYear,
    });

    revalidatePath("/recruiting");
    revalidatePath(`/recruiting/${person.id}`);
    revalidatePath("/people");
    return { success: true, personId: person.id };
  } catch (error) {
    console.error("[createRecruitAction] Unexpected error", error);
    return {
      success: false,
      error: "We couldn't create the recruit. Please try again.",
    };
  }
}

/**
 * Permanently delete a Person record (BP-041).
 * Cascades family relationship edges and Recruit Profile; other People are preserved.
 */
export async function deletePersonAction(
  personId: string,
): Promise<DeletePersonActionResult> {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return { success: false, error: auth.error };

  const trimmed = personId?.trim() ?? "";
  if (!trimmed) {
    return { success: false, error: "Person is required." };
  }

  const existing = await getPersonById(trimmed);
  if (!existing) {
    return { success: false, error: "Person not found." };
  }

  try {
    await deletePerson(trimmed);
    revalidatePath("/players-coaches");
    revalidatePath(`/players-coaches/${trimmed}`);
    revalidatePath("/team");
    revalidatePath(`/team/${trimmed}`);
    revalidatePath("/people");
    revalidatePath("/recruiting");
    revalidatePath(`/recruiting/${trimmed}`);
    return { success: true };
  } catch (error) {
    if (error instanceof PeopleRepositoryError) {
      console.error(`[deletePersonAction] ${error.message}`);
    } else {
      console.error("[deletePersonAction] Unexpected error", error);
    }
    return {
      success: false,
      error: "We couldn't delete this person. Please try again.",
    };
  }
}
