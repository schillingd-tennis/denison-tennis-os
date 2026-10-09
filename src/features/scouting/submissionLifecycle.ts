/** Browser-safe scouting submission lifecycle helpers. */
const ELIGIBLE_BACKFILL_STATUSES = new Set(["new", "reviewed", "needs_clarification", "needs_review"]);

export function isUnresolvedSubmissionForMatchReports(submission: { status: string; promotedDirectReportId?: string | null }): boolean {
  if (submission.promotedDirectReportId) return false;
  return submission.status === "new" || submission.status === "needs_review" || submission.status === "needs_clarification";
}

export function isEligibleUnpromotedSubmission(
  submission: { id: string; status: string; promotedDirectReportId?: string | null },
  reports: Array<{ formSubmissionId?: string | null }> = [],
): boolean {
  if (submission.promotedDirectReportId) return false;
  if (!ELIGIBLE_BACKFILL_STATUSES.has(submission.status)) return false;
  return !reports.some((report) => report.formSubmissionId === submission.id);
}

export function countEligibleUnpromotedSubmissions(
  submissions: Array<{ id: string; status: string; promotedDirectReportId?: string | null }>,
  reports: Array<{ formSubmissionId?: string | null }> = [],
): number {
  return submissions.filter((submission) => isEligibleUnpromotedSubmission(submission, reports)).length;
}

export function submissionStatusLabel(status: string): string {
  switch (status) {
    case "new": return "New";
    case "needs_review":
    case "needs_clarification": return "Needs Review";
    case "published":
    case "reviewed": return "Published";
    case "archived": return "Archived";
    case "rejected": return "Rejected";
    default: return status;
  }
}
