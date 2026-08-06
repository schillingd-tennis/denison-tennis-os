import { phoneHrefDigits } from "@/components/inline-edit";

import type { CommunicationActionKind } from "../types";

/**
 * Prepared toolbar / engine action (BP-032A).
 * Visible UI keeps current protocol links; `execute` is reserved for later.
 */
export type CommunicationAction = {
  kind: CommunicationActionKind;
  label: string;
  /** Present when a protocol URL can be opened today (unchanged UX). */
  href?: string;
  available: boolean;
  /**
   * Future engine entry point. Not wired to UI in BP-032A —
   * no visible behavior change.
   */
  execute: () => void;
};

export type CommunicationActionMap = Record<
  CommunicationActionKind,
  CommunicationAction
>;

function noop(): void {
  // Reserved for Communication Engine execution (Gmail, Twilio, etc.).
}

/**
 * Build person-agnostic communication actions for a workspace toolbar.
 * Call / Text / Email expose the same hrefs as today; Meeting / Note are stubs.
 */
export function createCommunicationActions(input: {
  personId: string;
  cellPhone?: string | null;
  email?: string | null;
}): CommunicationActionMap {
  const digits = phoneHrefDigits(input.cellPhone ?? undefined);
  const email = input.email?.trim() || undefined;
  const tel = digits ? `tel:${digits}` : undefined;
  const sms = digits ? `sms:${digits}` : undefined;
  const mailto = email ? `mailto:${email}` : undefined;

  return {
    call: {
      kind: "call",
      label: "Call",
      href: tel,
      available: Boolean(tel),
      execute: noop,
    },
    text: {
      kind: "text",
      label: "Text",
      href: sms,
      available: Boolean(sms),
      execute: noop,
    },
    email: {
      kind: "email",
      label: "Email",
      href: mailto,
      available: Boolean(mailto),
      execute: noop,
    },
    meeting: {
      kind: "meeting",
      label: "Meeting",
      available: false,
      execute: noop,
    },
    note: {
      kind: "note",
      label: "Note",
      available: false,
      execute: noop,
    },
  };
}
