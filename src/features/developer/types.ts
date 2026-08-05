export type EnvironmentKind = "local" | "hosted";

export type ConnectionStatus = "connected" | "not_connected";

export type ServiceStatus = "running" | "stopped" | "unknown";

export type MigrationEntry = {
  version: string;
  name: string;
};

export type PeopleRoleCounts = {
  total: number;
  players: number;
  coaches: number;
  alumni: number;
  staff: number;
  /** Reserved — Recruiting not wired to People yet. */
  recruits: number | null;
};

export type DeveloperSnapshot = {
  environment: EnvironmentKind;
  bannerLabel: "LOCAL DEVELOPMENT" | "HOSTED PRODUCTION";
  supabaseUrl: string;
  connectionStatus: ConnectionStatus;
  connectionError?: string;
  migrationVersion: string;
  migrations: MigrationEntry[];
  seedVersion: string;
  seedRecords?: number;
  people: PeopleRoleCounts;
  dockerStatus: ServiceStatus;
  localSupabaseStatus: ServiceStatus;
  studioUrl: string | null;
  /** Destructive CLI actions only allowed against a local stack. */
  localActionsEnabled: boolean;
  collectedAt: string;
};
