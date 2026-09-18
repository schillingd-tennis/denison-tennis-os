import type { WhatsAppMessageRow } from "../whatsapp";

/** Deterministic fixture corpus for unit tests (no live WhatsApp). */
export const FIXTURE_ACCOUNT_ID = "15550001111";

export const FIXTURE_RECRUIT_PHONE = "+15551234567";
export const FIXTURE_RECRUIT_JID = "15551234567@s.whatsapp.net";

export const FIXTURE_INTL_PHONE = "+447911123456";
export const FIXTURE_INTL_JID = "447911123456@s.whatsapp.net";

export const FIXTURE_AMBIGUOUS_PHONE = "+15559876543";
export const FIXTURE_AMBIGUOUS_JID = "15559876543@s.whatsapp.net";

export const FIXTURE_GROUP_JID = "12036301@g.us";

export function fixtureTextMessage(overrides: Partial<WhatsAppMessageRow> = {}): WhatsAppMessageRow {
  return {
    accountId: FIXTURE_ACCOUNT_ID,
    conversationId: FIXTURE_RECRUIT_JID,
    messageId: "MSG001",
    timestamp: 1_700_000_000,
    fromMe: false,
    text: "Hi Coach — interested in Denison",
    mediaKind: null,
    peerHandle: FIXTURE_RECRUIT_JID,
    isGroup: false,
    ...overrides,
  };
}

export function fixtureCorpus(): WhatsAppMessageRow[] {
  return [
    fixtureTextMessage({ messageId: "MSG001", timestamp: 1_700_000_000, fromMe: false }),
    fixtureTextMessage({
      messageId: "MSG002",
      timestamp: 1_700_000_100,
      fromMe: true,
      text: "Great to hear from you",
    }),
    fixtureTextMessage({
      messageId: "MSG003",
      timestamp: 1_700_000_200,
      fromMe: false,
      text: null,
      mediaKind: "image",
    }),
    fixtureTextMessage({
      messageId: "MSG004",
      conversationId: FIXTURE_INTL_JID,
      peerHandle: FIXTURE_INTL_JID,
      timestamp: 1_700_000_300,
      text: "Calling from UK",
    }),
    fixtureTextMessage({
      messageId: "MSG005",
      conversationId: FIXTURE_AMBIGUOUS_JID,
      peerHandle: FIXTURE_AMBIGUOUS_JID,
      timestamp: 1_700_000_400,
      text: "Which recruit am I?",
    }),
    fixtureTextMessage({
      messageId: "MSG006",
      conversationId: FIXTURE_GROUP_JID,
      peerHandle: null,
      isGroup: true,
      timestamp: 1_700_000_500,
      text: "Group noise",
    }),
    // Duplicate of MSG001 for idempotency tests
    fixtureTextMessage({ messageId: "MSG001", timestamp: 1_700_000_000, fromMe: false }),
  ];
}
