import type { UtrAgentCheckStatus } from "../types";
import type { LiveRecruitRow } from "../utrAgentIncremental";

export type BatchDisplayStatus = UtrAgentCheckStatus | LiveRecruitRow["liveStatus"];

export function batchStatusPillClass(status: BatchDisplayStatus): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold";
  switch (status) {
    case "Checking":
      return `${base} bg-blue-50 text-blue-700`;
    case "Pending":
      return `${base} bg-background text-text-secondary border border-border/70`;
    case "Checked":
      return `${base} bg-green-50 text-green-700`;
    case "New Results":
      return `${base} bg-[var(--module-accent)]/10 text-[var(--module-accent)]`;
    case "Needs Review":
      return `${base} bg-amber-50 text-amber-800`;
    case "Failed":
    case "Auth Required":
      return `${base} bg-red-50 text-red-700`;
    case "Not Configured":
      return `${base} bg-background text-text-secondary border border-border/70`;
    default:
      return `${base} bg-background text-text-secondary border border-border/70`;
  }
}

export function batchStatusLabel(status: BatchDisplayStatus): string {
  switch (status) {
    case "Checked":
      return "Checked";
    case "New Results":
      return "New Results";
    case "Needs Review":
      return "Needs Review";
    case "Not Configured":
      return "Not Configured";
    case "Auth Required":
      return "Auth Required";
    case "Failed":
      return "Failed";
    case "Checking":
      return "Checking";
    case "Pending":
      return "Pending";
    default:
      return String(status);
  }
}

export function activityBadgeLabel(row: LiveRecruitRow): string {
  const status = row.liveStatus ?? row.status;
  if (status === "Checking") return "Checking";
  if (status === "Pending") return "Pending";
  if (row.savedAsNew > 0) return "New";
  if (row.needsReview > 0) return "Review";
  if (row.status === "Failed" || row.status === "Auth Required") return "Failed";
  if (row.baselineAdded > 0) return "Baseline";
  if (row.matchesProcessed > 0) return "Checked";
  return batchStatusLabel(status);
}

export function activityBadgeClass(row: LiveRecruitRow): string {
  const label = activityBadgeLabel(row);
  switch (label) {
    case "Baseline":
      return batchStatusPillClass("Checked");
    case "New":
      return batchStatusPillClass("New Results");
    case "Review":
      return batchStatusPillClass("Needs Review");
    case "Failed":
      return batchStatusPillClass("Failed");
    case "Checking":
      return batchStatusPillClass("Checking");
    case "Pending":
      return batchStatusPillClass("Pending");
    default:
      return batchStatusPillClass("Checked");
  }
}
