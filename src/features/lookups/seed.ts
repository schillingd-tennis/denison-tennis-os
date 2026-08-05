/**
 * Canonical lookup seed for roles & statuses (BP-025A).
 * UUIDs are fixed so migrations, TypeScript, and seed.sql stay aligned.
 * Labels live here only as the initial DB seed — runtime UI reads from the tables.
 */

export type LookupSeedRow = {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

/** Stable role keys seeded into `roles.key`. */
export const ROLE_KEYS = {
  player: "player",
  coach: "coach",
  recruit: "recruit",
  alumni: "alumni",
  staff: "staff",
  family: "family",
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

/** Stable status keys seeded into `statuses.key`. */
export const STATUS_KEYS = {
  current: "current",
  former: "former",
} as const;

export type StatusKey = (typeof STATUS_KEYS)[keyof typeof STATUS_KEYS];

export const ROLE_SEED: readonly LookupSeedRow[] = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    key: ROLE_KEYS.player,
    label: "Player",
    sortOrder: 1,
    active: true,
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    key: ROLE_KEYS.coach,
    label: "Coach",
    sortOrder: 2,
    active: true,
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    key: ROLE_KEYS.recruit,
    label: "Recruit",
    sortOrder: 3,
    active: true,
  },
  {
    id: "a1000000-0000-4000-8000-000000000004",
    key: ROLE_KEYS.alumni,
    label: "Alumni",
    sortOrder: 4,
    active: true,
  },
  {
    id: "a1000000-0000-4000-8000-000000000005",
    key: ROLE_KEYS.staff,
    label: "Staff",
    sortOrder: 5,
    active: true,
  },
  {
    id: "a1000000-0000-4000-8000-000000000006",
    key: ROLE_KEYS.family,
    label: "Family",
    sortOrder: 6,
    active: true,
  },
] as const;

export const STATUS_SEED: readonly LookupSeedRow[] = [
  {
    id: "b1000000-0000-4000-8000-000000000001",
    key: STATUS_KEYS.current,
    label: "Current",
    sortOrder: 1,
    active: true,
  },
  {
    id: "b1000000-0000-4000-8000-000000000002",
    key: STATUS_KEYS.former,
    label: "Former",
    sortOrder: 2,
    active: true,
  },
] as const;

export function roleIdForKey(key: string): string {
  const row = ROLE_SEED.find((entry) => entry.key === key);
  if (!row) throw new Error(`Unknown role key: ${key}`);
  return row.id;
}

export function statusIdForKey(key: string): string {
  const row = STATUS_SEED.find((entry) => entry.key === key);
  if (!row) throw new Error(`Unknown status key: ${key}`);
  return row.id;
}

export function roleSeedByKey(key: string): LookupSeedRow {
  const row = ROLE_SEED.find((entry) => entry.key === key);
  if (!row) throw new Error(`Unknown role key: ${key}`);
  return row;
}

export function statusSeedByKey(key: string): LookupSeedRow {
  const row = STATUS_SEED.find((entry) => entry.key === key);
  if (!row) throw new Error(`Unknown status key: ${key}`);
  return row;
}

/**
 * Collapse legacy multi-role arrays to a single role key.
 * Prefer operational roles over Alumni when both are present.
 */
export function pickRoleKeyFromLegacy(roles: string[]): RoleKey {
  const set = new Set(roles);
  const priority: RoleKey[] = [
    ROLE_KEYS.coach,
    ROLE_KEYS.staff,
    ROLE_KEYS.recruit,
    ROLE_KEYS.player,
    ROLE_KEYS.alumni,
    ROLE_KEYS.family,
  ];
  for (const key of priority) {
    if (set.has(key)) return key;
  }
  return ROLE_KEYS.player;
}

/** Map legacy program status strings onto the BP-025A status keys. */
export function mapLegacyStatusKey(status: string): StatusKey {
  if (status === "alumni" || status === "former") return STATUS_KEYS.former;
  return STATUS_KEYS.current;
}
