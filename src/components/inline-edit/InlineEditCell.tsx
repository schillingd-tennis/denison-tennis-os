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
import { typeRole } from "@/components/typography";
import { EMPTY_VALUE } from "@/lib/formatting";

import { normalizeEmail, normalizePhone, normalizeUrl } from "./formatters";
import type {
  InlineCommitReason,
  InlineDensity,
  InlineEmphasis,
  InlineFieldType,
  InlineSelectOption,
} from "./types";
import { useIsMobileEditSurface, isMobileEditSurface } from "./useIsMobileEditSurface";

/** Apply type-aware normalization immediately before a commit reaches the parent. */
function normalizeForCommit(raw: string, type: InlineFieldType): string {
  if (type === "email") return normalizeEmail(raw) ?? "";
  if (type === "tel") return normalizePhone(raw) ?? "";
  if (type === "url") return normalizeUrl(raw) ?? "";
  return raw;
}

const inputClassName =
  "w-full min-w-0 rounded-control border border-[var(--module-accent)] bg-surface px-2 py-1.5 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]";

const compactInputClassName =
  "w-full min-w-0 rounded-control border border-[var(--module-accent)] bg-surface px-1.5 py-0.5 text-[15px] leading-snug text-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--module-accent)]";

function displayClassName(emphasis: InlineEmphasis, hasValue: boolean): string {
  if (emphasis === "directory" || emphasis === "metadata") {
    return typeRole.directoryMeta;
  }
  if (emphasis === "workspace") {
    return hasValue
      ? `whitespace-pre-wrap ${typeRole.workspaceFieldValue}`
      : `whitespace-pre-wrap ${typeRole.workspaceFieldValue} ${typeRole.metadataEmpty}`;
  }
  return hasValue
    ? `whitespace-pre-wrap ${typeRole.fieldValue}`
    : `whitespace-pre-wrap text-sm ${typeRole.metadataEmpty}`;
}

function focusEditor(
  node: HTMLInputElement | HTMLTextAreaElement,
  mode: "select-all" | "caret-end",
) {
  node.focus();
  const length = node.value.length;
  if (mode === "select-all") {
    node.select();
    return;
  }
  // Mobile: do not select-all. Caret at end so notes are easy to append.
  try {
    node.setSelectionRange(length, length);
  } catch {
    // Some input types (e.g. number/date) reject setSelectionRange.
  }
}

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
  density,
  rows,
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
  density: InlineDensity;
  rows?: number;
  onCancel: () => void;
  onCommit: (nextRaw: string, reason: InlineCommitReason) => void | Promise<void>;
  onExitFocus: () => void;
}) {
  const editorClass = density === "compact" ? compactInputClassName : inputClassName;
  const [draft, setDraft] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);
  const ignoreBlurRef = useRef(false);
  const committingRef = useRef(false);

  const resolvedRows = rows ?? (density === "compact" ? 3 : 4);

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    if (node instanceof HTMLSelectElement) {
      node.focus();
      return;
    }
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      // Read viewport at focus time so the first mobile paint never select-all.
      focusEditor(node, isMobileEditSurface() ? "caret-end" : "select-all");
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
    // Mobile long-text: require Save / Cancel (keyboard dismiss must not
    // auto-commit or fight the software keyboard).
    if (type === "textarea" && isMobileEditSurface()) {
      return;
    }
    void commit("blur");
  }

  function armExplicitAction() {
    ignoreBlurRef.current = true;
  }

  return (
    <div
      className="relative min-w-0"
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
          className={editorClass}
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
          rows={resolvedRows}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
          className={`${editorClass} min-h-[9rem] resize-y md:min-h-0`}
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
          className={editorClass}
        />
      )}
      {type === "textarea" ? (
        <div className="mt-2 flex items-center justify-end gap-2 md:hidden">
          <button
            type="button"
            className="inline-flex h-10 min-w-[4.5rem] items-center justify-center rounded-control px-3 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            onPointerDown={armExplicitAction}
            onClick={() => {
              setDraft(initialValue);
              onCancel();
              requestAnimationFrame(onExitFocus);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex h-10 min-w-[4.5rem] items-center justify-center rounded-control bg-[var(--module-accent)] px-3 text-sm font-semibold text-surface transition-opacity hover:opacity-90"
            onPointerDown={armExplicitAction}
            onClick={() => {
              void commit("enter");
            }}
          >
            Save
          </button>
        </div>
      ) : null}
      <ValidationMessage message={error} />
    </div>
  );
}

/**
 * A single spreadsheet-style editable cell.
 *
 * - Double click / Enter / F2 → enter edit mode (stops row-level click handlers)
 * - Default: double-click (or Enter / F2) enters edit; single click bubbles
 * - Optional `editOn="click"`: a click on the cell enters edit (directory standard)
 * - Enter → commit + exit (⌘/Ctrl+Enter for textarea)
 * - Tab / Shift+Tab → commit + ask parent to move focus
 * - Escape → cancel, restore original
 * - Blur → commit (desktop / single-line); mobile textarea uses Save / Cancel
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
  editOn = "double-click",
  align = "left",
  /**
   * `directory` / `metadata` = Team directory secondary token (BP-025H);
   * `workspace` = Adaptive Workspace content values;
   * `default` = generic field values.
   */
  emphasis = "default",
  density = "default",
  rows,
  className,
  emptyDisplay = EMPTY_VALUE,
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
  /**
   * How the resting cell enters edit. Team List keeps `double-click` so a
   * row click can still open the workspace. Recruiting List uses `click`
   * because the row is not a navigation target (name/avatar opens instead).
   */
  editOn?: "click" | "double-click";
  align?: "left" | "right";
  emphasis?: InlineEmphasis;
  density?: InlineDensity;
  rows?: number;
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
  const mobileSurface = useIsMobileEditSurface();

  const shown = displayValue !== undefined && displayValue !== "" ? displayValue : value || emptyDisplay;
  const alignClass = align === "right" ? "text-right" : "text-left";

  function enterEdit(event: MouseEvent) {
    if (disabled) return;
    event.preventDefault();
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

  const editHint =
    editing || disabled
      ? undefined
      : mobileSurface
        ? `Tap to edit ${label}`
        : editOn === "click"
          ? `Click to edit ${label}`
          : `Double-click to edit ${label}`;

  return (
    <div
      ref={cellRef}
      // Intentionally not role="gridcell" — the parent <td> already owns that
      // role when the table is role="grid". Nesting gridcells causes a11y/
      // hydration mismatches in Next's table markup.
      tabIndex={editing || disabled ? -1 : 0}
      aria-label={`${label}: ${shown}`}
      onClick={editing || editOn !== "click" ? undefined : enterEdit}
      onDoubleClick={editing || editOn !== "double-click" ? undefined : enterEdit}
      onKeyDown={editing ? undefined : handleCellKeyDown}
      className={`${editing ? "rounded-control ring-1 ring-[var(--module-accent)]/30" : `-mx-1 cursor-cell rounded-control px-1 py-0.5 outline-none transition-colors duration-150 hover:bg-[var(--module-tint)] focus-visible:ring-2 focus-visible:ring-[var(--module-accent)]/40 ${disabled ? "cursor-default hover:bg-transparent" : ""}`} ${alignClass} ${className ?? ""}`}
      title={editHint}
    >
      {editing ? (
        <InlineEditInput
          label={label}
          initialValue={value}
          type={type}
          options={options}
          step={step}
          error={error}
          density={density}
          rows={rows}
          onCancel={onCancel}
          onCommit={onCommit}
          onExitFocus={() => cellRef.current?.focus()}
        />
      ) : (
        (renderDisplay ?? (
          <span className={displayClassName(emphasis, Boolean(value))}>
            {shown}
          </span>
        ))
      )}
    </div>
  );
}
