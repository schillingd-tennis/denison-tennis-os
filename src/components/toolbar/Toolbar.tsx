import type { ReactNode } from "react";

/**
 * Standard module toolbar shell.
 *
 * Hierarchy (left → right / primary → tertiary):
 * 1. `primary` — search (dominant)
 * 2. `secondary` — filters / segmented options
 * 3. `tertiary` — view mode and other quiet toggles
 *
 * Domain-agnostic — Team, Recruiting, Operations, etc. compose the slots.
 */
export default function Toolbar({
  primary,
  secondary,
  tertiary,
  className = "",
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  tertiary?: ReactNode;
  className?: string;
}) {
  const hasTrailing = secondary != null || tertiary != null;

  return (
    <div
      className={[
        "flex flex-col gap-3.5 sm:flex-row sm:items-center sm:gap-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0 flex-1 sm:max-w-md">{primary}</div>
      {hasTrailing ? (
        <div className="flex flex-wrap items-center gap-3">
          {secondary}
          {tertiary}
        </div>
      ) : null}
    </div>
  );
}
