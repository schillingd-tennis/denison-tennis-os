"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { MessageCircle, Trash2 } from "lucide-react";

import QuickActionButton from "@/components/QuickActionButton";
import { typeRole } from "@/components/typography";
import { TEAM_DIRECTORY_NAME } from "@/features/people/directoryHierarchy";
import { recruitingPersonPath } from "@/lib/module-routes";
import { formatDate } from "@/lib/formatting";
import type { RecruitInteraction } from "../types";

function stopRow(event: { stopPropagation(): void }) {
  event.stopPropagation();
}

function InteractionNotes({
  notes,
  recruitName,
  onOpen,
  clamp,
}: {
  notes: string;
  recruitName: string;
  onOpen?: () => void;
  clamp: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    if (!clamp || expanded) {
      setOverflows(false);
      return;
    }
    const node = textRef.current;
    if (!node) {
      setOverflows(false);
      return;
    }
    setOverflows(node.scrollHeight > node.clientHeight + 1);
  }, [clamp, expanded, notes]);

  const clamped = clamp && !expanded;

  return (
    <div className="min-w-0">
      <p
        ref={textRef}
        role={onOpen ? "button" : undefined}
        tabIndex={onOpen ? 0 : undefined}
        aria-label={onOpen ? `Edit interaction with ${recruitName}` : undefined}
        onClick={
          onOpen
            ? (event) => {
                event.stopPropagation();
                onOpen();
              }
            : undefined
        }
        onKeyDown={
          onOpen
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onOpen();
                }
              }
            : undefined
        }
        className={`whitespace-pre-wrap text-sm leading-5 text-text-primary ${
          clamped ? "line-clamp-2" : ""
        } ${onOpen ? "cursor-pointer rounded-control hover:bg-app-background" : ""}`}
      >
        {notes}
      </p>
      {clamp && overflows ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((open) => !open);
          }}
          className="mt-0.5 text-[11px] font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

function WorkspaceInteractionRow({
  item,
  showRecruit,
  onOpen,
  onDelete,
}: {
  item: RecruitInteraction;
  showRecruit: boolean;
  onOpen?: (interaction: RecruitInteraction) => void;
  onDelete?: (interaction: RecruitInteraction) => void;
}) {
  return (
    <div className="flex gap-3 px-4 py-3.5 max-sm:px-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--module-accent)]/10 text-[var(--module-accent)]">
        <MessageCircle className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={typeRole.sectionLabel}>{item.interactionType}</span>
          <time className="text-xs text-text-secondary">{formatDate(item.occurredAt)}</time>
        </div>
        {showRecruit ? (
          <Link
            href={recruitingPersonPath(item.recruitPersonId)}
            onClick={stopRow}
            onMouseDown={stopRow}
            className="mt-1 block cursor-pointer font-semibold text-text-primary hover:text-[var(--module-accent)] hover:underline"
          >
            {item.recruitName}
          </Link>
        ) : null}
        {item.notes ? (
          <p
            role={onOpen ? "button" : undefined}
            tabIndex={onOpen ? 0 : undefined}
            aria-label={onOpen ? `Edit interaction with ${item.recruitName}` : undefined}
            onClick={
              onOpen
                ? (event) => {
                    event.stopPropagation();
                    onOpen(item);
                  }
                : undefined
            }
            onKeyDown={
              onOpen
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onOpen(item);
                    }
                  }
                : undefined
            }
            className={`mt-1 whitespace-pre-wrap text-sm text-text-primary ${
              onOpen ? "cursor-pointer rounded-control hover:bg-app-background" : ""
            }`}
          >
            {item.notes}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-text-secondary">
          {item.tournamentName ? <span>{item.tournamentName}</span> : null}
          {item.loggedBy ? <span>Logged by {item.loggedBy}</span> : null}
        </div>
        {item.nextSteps ? (
          <p className="mt-2 text-sm text-text-secondary">
            <span className="font-semibold">Next:</span> {item.nextSteps}
          </p>
        ) : null}
      </div>
      {onDelete ? (
        <div className="mt-0.5 shrink-0" onClick={stopRow} onMouseDown={stopRow}>
          <QuickActionButton
            size="compact"
            tone="denison"
            icon={Trash2}
            label="Delete interaction"
            onAction={() => onDelete(item)}
          />
        </div>
      ) : null}
    </div>
  );
}

function DirectoryInteractionRow({
  item,
  showRecruit,
  onOpen,
  onDelete,
}: {
  item: RecruitInteraction;
  showRecruit: boolean;
  onOpen?: (interaction: RecruitInteraction) => void;
  onDelete?: (interaction: RecruitInteraction) => void;
}) {
  return (
    <div
      data-interaction-directory-row=""
      className="flex min-h-[72px] items-center gap-3 px-3 py-2 max-md:min-h-0 max-md:items-start max-md:px-3 max-md:py-3"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--module-accent)]/10 text-[var(--module-accent)]">
        <MessageCircle className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {showRecruit ? (
            <Link
              href={recruitingPersonPath(item.recruitPersonId)}
              onClick={stopRow}
              onMouseDown={stopRow}
              className={`${TEAM_DIRECTORY_NAME} max-md:w-full hover:text-[var(--module-accent)] hover:underline`}
            >
              {item.recruitName}
            </Link>
          ) : null}
          <span className={typeRole.sectionLabel}>{item.interactionType}</span>
          <time className="text-xs text-text-secondary">{formatDate(item.occurredAt)}</time>
        </div>
        <div className="mt-0.5 flex min-w-0 flex-col gap-1 md:flex-row md:items-start md:gap-3">
          {item.notes ? (
            <div className="min-w-0 flex-1">
              <InteractionNotes
                notes={item.notes}
                recruitName={item.recruitName}
                clamp
                onOpen={onOpen ? () => onOpen(item) : undefined}
              />
            </div>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-xs leading-5 text-text-secondary md:max-w-[40%] md:justify-end">
            {item.tournamentName ? <span className="truncate">{item.tournamentName}</span> : null}
            {item.loggedBy ? <span className="truncate">Logged by {item.loggedBy}</span> : null}
            {item.nextSteps ? (
              <span className="min-w-0 truncate">
                <span className="font-medium text-text-secondary">Next:</span> {item.nextSteps}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {onDelete ? (
        <div className="shrink-0 self-center max-md:self-start" onClick={stopRow} onMouseDown={stopRow}>
          <QuickActionButton
            size="compact"
            tone="denison"
            icon={Trash2}
            label="Delete interaction"
            onAction={() => onDelete(item)}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function InteractionList({
  interactions,
  showRecruit = true,
  onOpen,
  onDelete,
  density = "workspace",
}: {
  interactions: RecruitInteraction[];
  showRecruit?: boolean;
  onOpen?: (interaction: RecruitInteraction) => void;
  onDelete?: (interaction: RecruitInteraction) => void;
  density?: "workspace" | "directory";
}) {
  if (!interactions.length) {
    return (
      <p className="rounded-card border border-border bg-surface p-5 text-sm text-text-secondary">
        No interaction history yet.
      </p>
    );
  }

  const directory = density === "directory";

  return (
    <div
      className={
        directory
          ? "overflow-hidden rounded-card border border-black/[0.06] bg-surface"
          : "overflow-hidden rounded-card border border-border bg-surface"
      }
    >
      <ul className={directory ? "divide-y divide-black/[0.06]" : "divide-y divide-border"}>
        {interactions.map((item) => (
          <li key={item.id} className={directory ? "transition-colors hover:bg-black/[0.015]" : undefined}>
            {directory ? (
              <DirectoryInteractionRow
                item={item}
                showRecruit={showRecruit}
                onOpen={onOpen}
                onDelete={onDelete}
              />
            ) : (
              <WorkspaceInteractionRow
                item={item}
                showRecruit={showRecruit}
                onOpen={onOpen}
                onDelete={onDelete}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
