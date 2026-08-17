"use client";

import { Mail, MessageSquare, Phone } from "lucide-react";

import QuickActionButton, { type QuickActionSize } from "@/components/QuickActionButton";
import { typeRole } from "@/components/typography";
import { EMPTY_VALUE } from "@/lib/formatting";

/**
 * OS-wide compact contact Actions: three fixed slots, left to right —
 * Call | Text | Email. Missing actions leave their slot empty and never
 * shift remaining buttons. Empty slots are blank (not disabled buttons).
 *
 * Default geometry matches directory Actions columns:
 * 3 × 40px + 2 × 4px gap = 128px.
 *
 * `size="compact"` (Rank View): 3 × 32px + 2 × 4px gap = 104px.
 */
export const CONTACT_ACTION_GROUP_WIDTH_CLASS = "w-[128px] min-w-[128px] max-w-[128px]";
export const CONTACT_ACTION_COMPACT_GROUP_WIDTH_CLASS =
  "w-[104px] min-w-[104px] max-w-[104px]";

const sizeLayout: Record<
  QuickActionSize,
  { groupHeight: string; slot: string; widthClass: string }
> = {
  default: {
    groupHeight: "h-10",
    slot: "inline-flex h-10 w-10 shrink-0 items-center justify-center",
    widthClass: CONTACT_ACTION_GROUP_WIDTH_CLASS,
  },
  compact: {
    groupHeight: "h-8",
    slot: "inline-flex h-8 w-8 shrink-0 items-center justify-center",
    widthClass: CONTACT_ACTION_COMPACT_GROUP_WIDTH_CLASS,
  },
};

export default function ContactActionSlots({
  tel,
  sms,
  mailto,
  size = "default",
  className = "",
}: {
  tel?: string;
  sms?: string;
  mailto?: string;
  /** Opt-in denser buttons for Rank View; directory/cards keep default. */
  size?: QuickActionSize;
  className?: string;
}) {
  const hasAny = Boolean(tel || sms || mailto);
  const layout = sizeLayout[size];

  return (
    <div
      role="group"
      aria-label="Contact actions"
      data-contact-action-slots={hasAny ? "occupied" : "empty"}
      data-contact-action-size={size}
      className={`flex ${layout.groupHeight} shrink-0 flex-nowrap items-center gap-1 ${layout.widthClass} ${className}`}
    >
      {hasAny ? (
        <>
          <span data-contact-slot="call" className={layout.slot}>
            {tel ? (
              <QuickActionButton
                href={tel}
                icon={Phone}
                label="Call"
                tone="success"
                size={size}
              />
            ) : null}
          </span>
          <span data-contact-slot="text" className={layout.slot}>
            {sms ? (
              <QuickActionButton
                href={sms}
                icon={MessageSquare}
                label="Text"
                tone="denison"
                size={size}
              />
            ) : null}
          </span>
          <span data-contact-slot="email" className={layout.slot}>
            {mailto ? (
              <QuickActionButton
                href={mailto}
                icon={Mail}
                label="Email"
                tone="info"
                size={size}
              />
            ) : null}
          </span>
        </>
      ) : (
        <span className={`flex w-full items-center justify-center ${typeRole.directoryMeta}`}>
          {EMPTY_VALUE}
        </span>
      )}
    </div>
  );
}
