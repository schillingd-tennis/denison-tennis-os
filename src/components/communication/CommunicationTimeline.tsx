"use client";

import EmptyState from "@/components/EmptyState";
import WorkspaceSection from "@/components/WorkspaceSection";
import { typeRole } from "@/components/typography";
import {
  COMMUNICATION_TYPE_META,
  sortCommunicationsNewestFirst,
  type Communication,
} from "@/features/communication";
import { EMPTY_VALUE, formatDate, formatTime } from "@/lib/formatting";

function formatOccurredAt(value: string): string {
  const date = formatDate(value);
  const time = formatTime(value);
  if (date === EMPTY_VALUE && time === EMPTY_VALUE) return EMPTY_VALUE;
  if (time === EMPTY_VALUE) return date;
  if (date === EMPTY_VALUE) return time;
  return `${date} · ${time}`;
}

function TimelineEntryRow({ entry }: { entry: Communication }) {
  const meta = COMMUNICATION_TYPE_META[entry.type];
  const Icon = meta.icon;
  const summary = entry.summary?.trim();
  const author = entry.author?.trim();

  return (
    <li className="group relative flex gap-4 pb-5 last:pb-0">
      <div className="flex w-8 shrink-0 flex-col items-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text-secondary">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </span>
        <span
          className="mt-1 w-px flex-1 bg-border group-last:hidden"
          aria-hidden
        />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={typeRole.sectionLabel}>{meta.label}</span>
          <time
            dateTime={entry.createdAt}
            className={`text-xs ${typeRole.metadataEmpty}`}
          >
            {formatOccurredAt(entry.createdAt)}
          </time>
        </div>
        <p className={`mt-1 ${typeRole.fieldValue}`}>{entry.title}</p>
        {summary ? (
          <p className="mt-1 text-sm text-text-secondary">{summary}</p>
        ) : null}
        {author ? (
          <p className={`mt-1.5 text-xs ${typeRole.metadataEmpty}`}>
            {author}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Chronological communication history.
 * Person-agnostic — drop into any Person workspace with typed entries.
 */
export default function CommunicationTimeline({
  entries = [],
  onAddCommunication,
  className,
}: {
  entries?: Communication[];
  /** When omitted, Add Communication is a non-functional placeholder. */
  onAddCommunication?: () => void;
  className?: string;
}) {
  const sorted = sortCommunicationsNewestFirst(entries);
  const canAdd = typeof onAddCommunication === "function";

  return (
    <WorkspaceSection
      title="Communication Timeline"
      className={className}
      action={
        <button
          type="button"
          onClick={canAdd ? onAddCommunication : undefined}
          disabled={!canAdd}
          aria-disabled={!canAdd}
          title={canAdd ? "Add Communication" : "Coming soon"}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-control bg-denison-red px-3.5 text-sm font-semibold text-surface transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-100"
        >
          Add Communication
        </button>
      }
    >
      {sorted.length === 0 ? (
        <EmptyState title="No communication history yet." compact />
      ) : (
        <ol className="relative">
          {sorted.map((entry) => (
            <TimelineEntryRow key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </WorkspaceSection>
  );
}
