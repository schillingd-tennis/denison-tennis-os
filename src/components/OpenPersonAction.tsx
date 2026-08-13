import { UserRound } from "lucide-react";

import QuickActionButton from "@/components/QuickActionButton";

/**
 * Compact red icon action that opens a Person / Player / Parent record.
 * Same visual treatment as Family workspace “Open Parent”.
 *
 * Optional `fromPlayerId` preserves originating Player context for
 * Family Person “Back to Player” navigation (`?fromPlayer=`).
 */
export default function OpenPersonAction({
  href,
  label,
  fromPlayerId,
}: {
  href: string;
  /** Accessible label + tooltip (icon-only UI). */
  label: "Open Player" | "Open Parent" | "Open Person";
  /** When opening a parent from a player's Family workspace. */
  fromPlayerId?: string;
}) {
  const destination =
    fromPlayerId && fromPlayerId.trim()
      ? `${href}${href.includes("?") ? "&" : "?"}fromPlayer=${encodeURIComponent(fromPlayerId.trim())}`
      : href;

  return (
    <QuickActionButton href={destination} icon={UserRound} label={label} tone="denison" />
  );
}
