import { TEAM_DIRECTORY_EMPTY } from "@/features/people/directoryHierarchy";

import { recruitStatusToneClass, type RecruitStatusTone } from "./statusPresentation";

const badgeClass =
  "inline-flex max-w-full items-center truncate rounded-[8px] px-2.5 py-1 text-xs font-medium leading-4";

export default function RecruitStatusBadge({
  label,
  tone,
}: {
  label: string | undefined | null;
  tone: RecruitStatusTone;
}) {
  if (!label) {
    return <span className="text-sm text-text-secondary/45">{TEAM_DIRECTORY_EMPTY}</span>;
  }

  return <span className={`${badgeClass} ${recruitStatusToneClass[tone]}`}>{label}</span>;
}
