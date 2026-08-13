import { UserRound } from "lucide-react";

import QuickActionButton from "@/components/QuickActionButton";

/**
 * Compact red icon action that opens a Person / Player / Parent record.
 * Same visual treatment as Family workspace “Open Parent”.
 */
export default function OpenPersonAction({
  href,
  label,
}: {
  href: string;
  /** Accessible label + tooltip (icon-only UI). */
  label: "Open Player" | "Open Parent" | "Open Person";
}) {
  return (
    <QuickActionButton href={href} icon={UserRound} label={label} tone="denison" />
  );
}
