export type AutomationProvider = "utr" | "wtn" | "trn";
export type AutomationAuthStatus = "unknown" | "valid" | "reauth_required" | "not_configured" | "error";
export type AutomationJobStatus = "queued" | "running" | "complete" | "partial" | "auth_required" | "error";

export type AutomationWorker = {
  provider: AutomationProvider;
  workerId: string | null;
  heartbeatAt: string | null;
  authStatus: AutomationAuthStatus;
  lastError: string | null;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  checkedCount: number;
};

export type AutomationJob = {
  id: string;
  provider: AutomationProvider;
  kind: "results" | "profile" | "rating";
  scope: "recruits" | "team";
  status: AutomationJobStatus;
  source: "manual" | "schedule" | "retry";
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
  checkedCount: number;
  totalCount: number;
  error: string | null;
};

export type AutomationAlert = {
  id: string;
  severity: "warning" | "critical";
  code: string;
  provider: AutomationProvider | null;
  jobId: string | null;
  message: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type AutomationHealthSnapshot = {
  workers: AutomationWorker[];
  jobs: AutomationJob[];
  alerts: AutomationAlert[];
  collectedAt: string;
};
