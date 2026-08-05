"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import ValidationMessage from "@/components/editor/ValidationMessage";

import { normalizeEmail, normalizePhone, normalizeUrl } from "./formatters";
import type { InlineCommitReason, InlineFieldType, InlineSelectOption } from "./types";

/** Apply type-aware normalization immediately before a commit reaches the parent. */
function normalizeForCommit(raw: string, type: InlineFieldType): string {
  if (type === "email") return normalizeEmail(raw) ?? "";
  if (type === "tel") return normalizePhone(raw) ?? "";
  if (type === "url") return normalizeUrl(raw) ?? "";
  return raw;
}

const inputClassName =
  "w-full min-w-0 rounded-control border border-denison-red bg-surface px-2 py-1.5 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-denison-red";

/**
 * Mounted only while a cell is being edited — owns draft state so entering
 * edit mode never needs a setState-in-effect sync against props.
 */
function InlineEditInput({
  label,
  initialValue,
  type,
  options,
  step,
  error,
  onCancel,
  onCommit,
  onExitFocus,
}: {
  label: string;
  initialValue: string;
  type: InlineFieldType;
  options?: InlineSelectOption[];
  step?: number;
  error?: string;
  onCancel: () => void;
  onCommit: (nextRaw: string, reason: InlineCommitReason) => void | Promise<void>;
  onExitFocus: () => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);
  const ignoreBlurRef = useRef(false);
  const committingRef = useRef(false);

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      node.select();
    }
  }, []);

  async function commit(reason: InlineCommitReason, raw: string = draft) {
    if (committingRef.current) return;
    committingRef.current = true;
    const normalized = normalizeForCommit(raw, type);
    if (normalized !== raw) setDraft(normalized);
    try {
      await onCommit(normalized, reason);
    } finally {
      committingRef.current = false;
      if (reason === "enter" || reason === "blur" || reason === "select") {
        requestAnimationFrame(onExitFocus);
      }
    }
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter") {
      // Textareas need Enter for newlines; commit on Enter for other types.
      if (type === "textarea") {
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          ignoreBlurRef.current = true;
          void commit("enter");
        }
        return;
      }
      event.preventDefault();
      ignoreBlurRef.current = true;
      void commit("enter");
    } else if (event.key === "Tab") {
      event.preventDefault();
      ignoreBlurRef.current = true;
      void commit(event.shiftKey ? "shift-tab" : "tab");
    } else if (event.key === "Escape") {
      event.preventDefault();
      ignoreBlurRef.current = true;
      setDraft(initialValue);
      onCancel();
      requestAnimationFrame(onExitFocus);
    }
  }

  function handleBlur() {
    if (ignoreBlurRef.current) {
      ignoreBlurRef.current = false;
      return;
    }
    void commit("blur");
  }

  return (
    <div
      className="relative"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {type === "select" ? (
        <select
          ref={(node) => {
            inputRef.current = node;
          }}
          aria-label={label}
          value={draft}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            ignoreBlurRef.current = true;
            void commit("select", next);
          }}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
          className={inputClassName}
        >
          <option value="">—</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          ref={(node) => {
            inputRef.current = node;
          }}
          aria-label={label}
          value={draft}
          rows={4}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
          className={`${inputClassName} resize-y`}
        />
      ) : (
        <input
          ref={(node) => {
            inputRef.current = node;
          }}
          aria-label={label}
          type={
            type === "number"
              ? "number"
              : type === "email"
                ? "email"
                : type === "tel"
                  ? "tel"
                  : type === "url"
                    ? "url"
                    : type === "date"
                      ? "date"
                      : "text"
          }
          value={draft}
          step={step}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
          className={inputClassName}
        />
      )}
      <ValidationMessage message={error} />
    </div>
  );
}

/**
 * A single spreadsheet-style editable cell.
 *
 * - Double click / Enter / F2 → enter edit mode (stops row-level click handlers)
 * - Single click bubbles so parent rows can navigate on click
 * - Enter → commit + exit (⌘/Ctrl+Enter for textarea)
 * - Tab / Shift+Tab → commit + ask parent to move focus
 * - Escape → cancel, restore original
 * - Blur → commit
 *
 * Knows nothing about Person / Team / any record shape — the parent supplies
 * `value`/`displayValue` and handles persistence in `onCommit`.
 */
export default function InlineEditCell({
  label,
  value,
  displayValue,
  renderDisplay,
  type = "text",
  options,
  step,
  editing,
  disabled,
  error,
  align = "left",
  className,
  emptyDisplay = "—",
  onRequestEdit,
  onCancel,
  onCommit,
}: {
  /** Accessible name for the cell (e.g. "Major"). */
  label: string;
  /** Raw editable value as a string (numbers/enums stringified by the caller). */
  value: string;
  /** What to show when not editing. Falls back to `value` or `emptyDisplay`. */
  displayValue?: string;
  /** Optional custom display node (e.g. a status badge). Overrides `displayValue` text. */
  renderDisplay?: ReactNode;
  type?: InlineFieldType;
  options?: InlineSelectOption[];
  step?: number;
  editing: boolean;
  disabled?: boolean;
  error?: string;
  align?: "left" | "right";
  className?: string;
  emptyDisplay?: string;
  onRequestEdit: () => void;
  onCancel: () => void;
  /**
   * Persist the draft. Parent should no-op (and still exit edit) when the
   * value is unchanged. Return a promise so the cell can await auto-save
   * before asking the parent to move to the next field.
   */
  onCommit: (nextRaw: string, reason: InlineCommitReason) => void | Promise<void>;
}) {
  const cellRef = useRef<HTMLDivElement | null>(null);

  const shown = displayValue !== undefined && displayValue !== "" ? displayValue : value || emptyDisplay;
  const alignClass = align === "right" ? "text-right" : "text-left";

  function handleDoubleClick(event: MouseEvent) {
    if (disabled) return;
    event.preventDefault();
    // Stop the row's single-click navigation; parent also cancels any pending timer.
    event.stopPropagation();
    onRequestEdit();
  }

  function handleCellKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (editing || disabled) return;
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      event.stopPropagation();
      onRequestEdit();
    }
  }

  return (
    <div
      ref={cellRef}
      // Intentionally not role="gridcell" — the parent <td> already owns that
      // role when the table is role="grid". Nesting gridcells causes a11y/
      // hydration mismatches in Next's table markup.
      tabIndex={editing || disabled ? -1 : 0}
      aria-label={`${label}: ${shown}`}
      onDoubleClick={editing ? undefined : handleDoubleClick}
      onKeyDown={editing ? undefined : handleCellKeyDown}
      className={`${editing ? "rounded-control ring-1 ring-denison-red/30" : `-mx-1 cursor-cell rounded-control px-1 py-0.5 outline-none transition-colors duration-150 hover:bg-denison-red/[0.04] focus-visible:ring-2 focus-visible:ring-denison-red/40 ${disabled ? "cursor-default hover:bg-transparent" : ""}`} ${alignClass} ${className ?? ""}`}
      title={editing || disabled ? undefined : `Double-click to edit ${label}`}
    >
      {editing ? (
        <InlineEditInput
          label={label}
          initialValue={value}
          type={type}
          options={options}
          step={step}
          error={error}
          onCancel={onCancel}
          onCommit={onCommit}
          onExitFocus={() => cellRef.current?.focus()}
        />
      ) : (
        (renderDisplay ?? (
          <span
            className={`text-sm whitespace-pre-wrap ${value ? "text-text-primary" : "text-text-secondary/70"}`}
          >
            {shown}
          </span>
        ))
      )}
    </div>
  );
}
