import type { RecruitMatchInput } from "../appleMessages";

import type { RecruitCatalogPort } from "./ports";
import type { ScanMatchContext } from "./scan";

export function createStaticRecruitCatalog(context: ScanMatchContext): RecruitCatalogPort {
  return {
    async loadMatchContext() {
      return context;
    },
  };
}

type LookupKey = { key: string } | { key: string }[] | null;

export type PersonRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  cell_phone: string | null;
  personal_email: string | null;
  denison_email: string | null;
  role?: LookupKey;
  status?: LookupKey;
};

function lookupKey(value: LookupKey | undefined): string | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return row?.key ?? null;
}

function toMatchInput(person: PersonRow): RecruitMatchInput {
  return {
    id: person.id,
    name: displayName(person),
    osHandles: [person.cell_phone, person.personal_email, person.denison_email].filter(
      (value): value is string => Boolean(value),
    ),
  };
}

export type RecruitsQuery = {
  data: unknown[] | null;
  error: { message: string } | null;
};

export type RecruitsClient = {
  from: (table: string) => {
    select: (columns: string) => Promise<RecruitsQuery> | RecruitsEq;
  };
};

type RecruitsEq = {
  eq: (column: string, value: string) => Promise<RecruitsQuery>;
};

function displayName(row: PersonRow): string {
  const first = (row.preferred_name || row.first_name || "").trim();
  return `${first} ${row.last_name ?? ""}`.trim();
}

export function recruitsFromProductionRows(
  profiles: Array<{ person_id: string }>,
  people: PersonRow[],
): RecruitMatchInput[] {
  return matchSetsFromProductionRows(profiles, people).recruits;
}

export function matchSetsFromProductionRows(
  profiles: Array<{ person_id: string }>,
  people: PersonRow[],
): { recruits: RecruitMatchInput[]; currentTeam: RecruitMatchInput[] } {
  const profileIds = new Set(profiles.map((row) => row.person_id).filter(Boolean));
  const currentTeam: RecruitMatchInput[] = [];
  const recruits: RecruitMatchInput[] = [];
  for (const person of people) {
    const roleKey = lookupKey(person.role);
    const statusKey = lookupKey(person.status);
    const input = toMatchInput(person);
    if (statusKey === "current" && (roleKey === "player" || roleKey === "coach")) {
      currentTeam.push(input);
      continue;
    }
    if (profileIds.has(person.id) && roleKey === "recruit") {
      recruits.push(input);
    }
  }
  return { recruits, currentTeam };
}

/**
 * Loads recruit match inputs through an injected client. Tests pass a fake;
 * this never opens a hosted connection itself.
 */
export function createProductionRecruitCatalog(
  client: RecruitsClient,
  extras: Pick<ScanMatchContext, "contacts" | "overrides"> = {
    contacts: new Map(),
    overrides: {},
  },
): RecruitCatalogPort {
  return {
    async loadMatchContext() {
      const profilesQuery = client.from("recruit_profiles").select("person_id");
      const peopleQuery = client
        .from("production_people")
        .select(
          "id, first_name, last_name, preferred_name, cell_phone, personal_email, denison_email, role:roles!role_id(key), status:statuses!status_id(key)",
        );
      const [profilesResult, peopleResult] = await Promise.all([
        Promise.resolve(profilesQuery as Promise<RecruitsQuery>),
        Promise.resolve(peopleQuery as Promise<RecruitsQuery>),
      ]);
      if (profilesResult.error) throw new Error(profilesResult.error.message);
      if (peopleResult.error) throw new Error(peopleResult.error.message);
      const sets = matchSetsFromProductionRows(
        (profilesResult.data ?? []) as Array<{ person_id: string }>,
        (peopleResult.data ?? []) as PersonRow[],
      );
      return {
        recruits: sets.recruits,
        currentTeam: sets.currentTeam,
        contacts: extras.contacts,
        overrides: extras.overrides,
      };
    },
  };
}
