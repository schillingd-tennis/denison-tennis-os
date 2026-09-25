export const UTR_WORKER_POLL_INTERVAL_MS = 60_000;
export const UTR_WORKER_HEARTBEAT_INTERVAL_MS = 30_000;
export const UTR_WORKER_LEASE_MS = 10 * 60_000;
export const UTR_WORKER_RETRY_MS = 60 * 60_000;

export function easternDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function utrWorkerRetryAt(now = Date.now()): string {
  return new Date(now + UTR_WORKER_RETRY_MS).toISOString();
}

export function utrWorkerLeaseUntil(now = Date.now()): string {
  return new Date(now + UTR_WORKER_LEASE_MS).toISOString();
}
