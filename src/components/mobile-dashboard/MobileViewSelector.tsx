"use client";

import { Check, ChevronDown, Layers } from "lucide-react";
import { useEffect, useId, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";

export type MobileViewOption<T extends string> = {
  value: T;
  label: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
};

/**
 * OS-wide mobile view picker. Desktop keeps `ViewToggle` / segmented control.
 * This control is `md:hidden` only.
 */
export default function MobileViewSelector<T extends string>({
  value,
  onChange,
  options,
  ariaLabel = "Change view",
  triggerLabel = "View",
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly MobileViewOption<T>[];
  ariaLabel?: string;
  triggerLabel?: string;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);
  const CurrentIcon = current?.icon;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function select(next: T) {
    onChange(next);
    setOpen(false);
  }

  const sheet =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-mobile-view-selector=""
          >
            <button
              type="button"
              aria-label="Close view selector"
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-card bg-surface shadow-[0_-12px_40px_rgba(17,24,39,0.12)]">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3">
                <h2 id={titleId} className="text-base font-semibold text-text-primary">
                  {triggerLabel}
                </h2>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto px-2 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
                role="listbox"
                aria-label={ariaLabel}
              >
                {options.map((option) => {
                  const selected = option.value === value;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => select(option.value)}
                      className={[
                        "flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-[15px] transition-colors",
                        selected
                          ? "bg-[var(--module-tint)]/50 font-semibold text-[var(--module-accent)]"
                          : "font-medium text-text-secondary hover:bg-app-background hover:text-text-primary",
                      ].join(" ")}
                    >
                      {Icon ? (
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                      ) : (
                        <Layers className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">{option.label}</span>
                      {selected ? (
                        <Check className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-surface px-3.5 text-[13px] font-medium text-text-secondary ring-1 ring-black/[0.06]"
      >
        {CurrentIcon ? (
          <CurrentIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        ) : (
          <Layers className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        )}
        <span>
          {triggerLabel}
          {current ? `: ${current.label}` : ""}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} aria-hidden />
      </button>
      {sheet}
    </div>
  );
}
