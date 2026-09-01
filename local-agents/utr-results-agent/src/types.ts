export type UtrAgentErrorCode =
  | "AUTH_REQUIRED"
  | "UTR_PROFILE_NOT_CONFIGURED"
  | "UTR_PAGE_LOAD_FAILED"
  | "UTR_RESULTS_FAILED"
  | "UTR_RESULTS_HTTP_ERROR"
  | "UTR_RESULTS_PARSE_FAILED"
  | "PROFILE_LOADED_RESULTS_REQUEST_NOT_SEEN"
  | "UTR_RESULTS_EMPTY"
  | "AGENT_BUSY";

export type UtrDiagnosticStatus =
  | "UTR_RESULTS_SUCCESS"
  | "UTR_RESULTS_EMPTY"
  | "AUTH_REQUIRED"
  | "UTR_PROFILE_NOT_CONFIGURED"
  | "UTR_PAGE_LOAD_FAILED"
  | "PROFILE_LOADED_RESULTS_REQUEST_NOT_SEEN"
  | "UTR_RESULTS_HTTP_ERROR"
  | "UTR_RESULTS_PARSE_FAILED"
  | "UTR_RESULTS_FAILED";

export type UtrAgentRecruitStatus =
  | "OK"
  | "AUTH_REQUIRED"
  | "NOT_CONFIGURED"
  | "UTR_PAGE_LOAD_FAILED"
  | "UTR_RESULTS_FAILED";

export type ApiPathDiagnostics = {
  observed?: boolean;
  attempted?: boolean;
  requestUrl?: string;
  method?: string;
  httpStatus?: number;
  contentType?: string;
  bodySummary?: string;
  jsonCaptured?: boolean;
};

export type RecruitCheckDiagnostics = {
  profileUrlRequested: string;
  finalPageUrl: string;
  navigationStatus?: number;
  pageTitle: string;
  signInGateVisible: boolean;
  profileNameVisible: boolean;
  resultsTabVisible: boolean;
  profileLoaded: boolean;
  loggedInProfileVisible: boolean;
  pageRequestPath: ApiPathDiagnostics;
  fallbackFetchPath: ApiPathDiagnostics;
  diagnosticStatus?: UtrDiagnosticStatus;
  responseSummary?: string;
};

export type AgentRecruitInput = {
  recruitPersonId: string;
  displayName: string;
  utrPlayerId?: string;
};

export type AgentCheckMode = "isaac-only" | "all";

export type AgentCheckRequest = {
  mode: AgentCheckMode;
  recruits: AgentRecruitInput[];
};

export type AgentRecruitResult = {
  recruitPersonId: string;
  displayName: string;
  utrPlayerId?: string;
  status: UtrAgentRecruitStatus;
  errorCode?: UtrAgentErrorCode;
  errorMessage?: string;
  sourceUrl?: string;
  matchesRead: number;
  startedAt?: string;
  finishedAt?: string;
  payload?: unknown;
  diagnosticStatus?: UtrDiagnosticStatus;
  diagnostics?: RecruitCheckDiagnostics;
};

export type AgentCheckResponse = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  stoppedEarly: boolean;
  stopReason?: string;
  recruits: AgentRecruitResult[];
  summary: {
    recruitsRequested: number;
    recruitsChecked: number;
    recruitsFailed: number;
    recruitsNotConfigured: number;
    matchesRead: number;
  };
};

export type AgentRunLogEntry = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  recruit: string;
  status: UtrAgentRecruitStatus;
  matchesRead: number;
  newCount?: number;
  errorCode?: string;
  diagnosticStatus?: UtrDiagnosticStatus;
  diagnostics?: RecruitCheckDiagnostics;
};
