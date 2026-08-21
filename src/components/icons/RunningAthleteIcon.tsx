import type { LucideProps } from "lucide-react";

/**
 * Simple running-athlete silhouette for Game Notes quick-entry.
 * Lucide 1.28 (project lock) has no PersonRunning — keep this local rather
 * than adding an icon dependency. Matches Lucide stroke conventions.
 */
export default function RunningAthleteIcon({
  className,
  strokeWidth = 2,
  ...props
}: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      {/* Head */}
      <circle cx="13.5" cy="4.25" r="1.75" />
      {/* Torso + lead arm */}
      <path d="M12.5 6.5 10 11.25l3.25 2.1 2.4-3.35" />
      {/* Trail arm */}
      <path d="M10.1 8.4 7.35 7.15" />
      {/* Lead leg */}
      <path d="M13.25 13.35 15.1 17.6l2.85.35" />
      {/* Trail leg */}
      <path d="M11.6 12.85 8.35 16.4 5.9 15.7" />
    </svg>
  );
}
