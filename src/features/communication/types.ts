/**
 * Communication Engine domain model (BP-032A).
 * Person-agnostic — reusable for players, recruits, coaches, alumni, parents.
 */

/** Built-in types. New kinds can be added without changing consumers. */
export type CommunicationType =
  | "call"
  | "text"
  | "email"
  | "meeting"
  | "note";

/** Toolbar / engine actions that create or launch a communication. */
export type CommunicationActionKind =
  | "call"
  | "text"
  | "email"
  | "meeting"
  | "note";

export type CommunicationAttachment = {
  id: string;
  name: string;
  /** MIME type when known. */
  contentType?: string;
  url?: string;
};

/**
 * Extensible bag for channel-specific fields (thread ids, duration, etc.).
 * Persistence shape is intentionally loose until a later milestone.
 */
export type CommunicationMetadata = Record<string, string | number | boolean | null>;

export type Communication = {
  id: string;
  personId: string;
  type: CommunicationType;
  title: string;
  summary?: string;
  body?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  followUpDate?: string;
  /** Reserved — not used in BP-032A. */
  attachments?: CommunicationAttachment[];
  metadata?: CommunicationMetadata;
};

/** @deprecated Prefer `Communication`. Kept for timeline UI compatibility. */
export type CommunicationEntry = Communication;
