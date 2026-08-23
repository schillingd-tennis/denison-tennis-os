"use client";

import Link from "next/link";
import { MessageCircle, Trash2 } from "lucide-react";

import QuickActionButton from "@/components/QuickActionButton";
import { typeRole } from "@/components/typography";
import { recruitingPersonPath } from "@/lib/module-routes";
import { formatDate } from "@/lib/formatting";
import type { RecruitInteraction } from "../types";

function stopRow(event: { stopPropagation(): void }) {
  event.stopPropagation();
}

export default function InteractionList({
  interactions,
  showRecruit = true,
  onOpen,
  onDelete,
}: {
  interactions: RecruitInteraction[];
  showRecruit?: boolean;
  onOpen?: (interaction: RecruitInteraction) => void;
  onDelete?: (interaction: RecruitInteraction) => void;
}) {
  if (!interactions.length) {
    return <p className="rounded-card border border-border bg-surface p-5 text-sm text-text-secondary">No interaction history yet.</p>;
  }
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <ul className="divide-y divide-border">
        {interactions.map((item) => (
          <li key={item.id}>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
