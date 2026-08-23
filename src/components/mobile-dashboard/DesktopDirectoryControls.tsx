import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

/**
 * Desktop directory control cluster (filter chips, extra toolbar actions).
 *
 * Desktop-first: `flex` is the default display. Mobile hides this with
 * `max-md:hidden`. Do **not** use `hidden md:flex` — if `md:flex` is not
 * generated, the cluster stays `display: none` on desktop (the Filters
 * regression). Mobile View + Filters stay in `MobileDirectoryControls`
 * (`md:hidden`) so the two branches cannot hide each other.
 */
export const DESKTOP_DIRECTORY_CONTROLS_CLASS =
  "flex min-w-0 flex-wrap items-center gap-2 max-md:hidden";

const DesktopDirectoryControls = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>
>(function DesktopDirectoryControls({ children, className, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={`${DESKTOP_DIRECTORY_CONTROLS_CLASS}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {children}
    </div>
  );
});

export default DesktopDirectoryControls;
