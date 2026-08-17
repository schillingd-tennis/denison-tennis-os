"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import { Pin, PinOff, Search } from "lucide-react";

import { useCommandPalette } from "@/components/command-palette/CommandPaletteProvider";
import CommandPreviewPanel from "@/components/command-palette/CommandPreviewPanel";
import {
  buildCommandIndexes,
  favoriteFromCommand,
  favoriteKey,
  resolvePinnedToCommand,
  toggleFavorite,
  useFavorites,
  useIsFavorite,
  useRecents,
  recordRecentOpen,
} from "@/components/command-palette/favorites";
import { scoreCommand } from "@/components/command-palette/fuzzy";
import { commandRegistry } from "@/components/command-palette/registry";
import {
  registerDefaultCommands,
  warmCommandPalette,
} from "@/components/command-palette/registerDefaultCommands";
import { lockBodyScroll, unlockBodyScroll } from "@/components/command-palette/lockBodyScroll";
import {
  SEARCH_DISPLAY_GROUP_LABEL,
  SEARCH_DISPLAY_GROUP_ORDER,
  displayGroupForType,
  type CommandDefinition,
  type RankedCommand,
  type SearchDisplayGroup,
} from "@/components/command-palette/types";

type ResultSection = {
  key: string;
  title: string;
  items: RankedCommand[];
};

function sectionsFromSearchResults(commands: RankedCommand[]): ResultSection[] {
  const byGroup = new Map<SearchDisplayGroup, RankedCommand[]>();
  for (const command of commands) {
    const group = displayGroupForType(command.objectType);
    const list = byGroup.get(group) ?? [];
    list.push(command);
    byGroup.set(group, list);
  }

  return SEARCH_DISPLAY_GROUP_ORDER.filter((group) => (byGroup.get(group)?.length ?? 0) > 0).map(
    (group) => ({
      key: group,
      title: SEARCH_DISPLAY_GROUP_LABEL[group],
      items: byGroup.get(group) ?? [],
    }),
  );
}

const BROWSE_HIDDEN_TYPES = new Set(["people", "coaches", "staff", "recruits"]);

function PinToggleControl({
  command,
  onToggle,
}: {
  command: CommandDefinition;
  onToggle: (command: CommandDefinition) => void;
}) {
  const favorite = favoriteFromCommand(command);
  const pinned = useIsFavorite(favorite.objectType, favorite.objectId);

  function handleClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onToggle(command);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={pinned ? "Unpin from Favorites" : "Pin to Favorites"}
      title={pinned ? "Unpin" : "Pin"}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control transition-colors ${
        pinned
          ? "text-[var(--module-accent)] hover:bg-[var(--module-tint)]"
          : "text-text-secondary/50 hover:bg-app-background hover:text-text-secondary"
      }`}
    >
      {pinned ? (
        <PinOff className="h-3.5 w-3.5" strokeWidth={2} />
      ) : (
        <Pin className="h-3.5 w-3.5" strokeWidth={2} />
      )}
    </button>
  );
}

function CommandPaletteDialog({
  sessionId,
  onClose,
}: {
  sessionId: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const favorites = useFavorites();
  const recents = useRecents();
  const [query, setQuery] = useState("");
  const [commands, setCommands] = useState<CommandDefinition[]>(() => {
    registerDefaultCommands();
    return commandRegistry.peekResolved();
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [loadingIndex, setLoadingIndex] = useState(() => commandRegistry.peekResolved().length === 0);

  const notify = useCallback((message: string) => {
    setFeedback(message);
  }, []);

  const indexes = useMemo(() => buildCommandIndexes(commands), [commands]);

  const runCommand = useCallback(
    (command: CommandDefinition) => {
      recordRecentOpen(favoriteFromCommand(command));
      startTransition(() => {
        void Promise.resolve(
          command.perform({
            navigate: (href) => {
              router.push(href);
            },
            close: onClose,
            notify,
          }),
        );
      });
    },
    [notify, onClose, router],
  );

  const handlePinToggle = useCallback(
    (command: CommandDefinition) => {
      const item = favoriteFromCommand(command);
      const nowPinned = toggleFavorite(item);
      notify(nowPinned ? `Pinned ${item.displayName}` : `Unpinned ${item.displayName}`);
    },
    [notify],
  );

  useEffect(() => {
    registerDefaultCommands();

    let cancelled = false;
    void (async () => {
      try {
        const resolved = await commandRegistry.resolveAll();
        if (!cancelled) {
          setCommands(resolved);
          setLoadingIndex(false);
        }
      } catch {
        if (!cancelled) {
          setCommands(commandRegistry.listStatic());
          setLoadingIndex(false);
        }
      }
    })();

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    // BP-024C: block background scroll without touching body overflow
    // (overflow:hidden removes the scrollbar and shifts page width).
    lockBodyScroll("[data-command-palette-scroll]");

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      unlockBodyScroll();
    };
  }, [sessionId]);

  const { sections, flat } = useMemo(() => {
    const trimmed = query.trim();

    const favoriteCommands: RankedCommand[] = favorites.map((item, index) => ({
      ...resolvePinnedToCommand(item, indexes.byCommandId, indexes.byObjectKey),
      score: 2000 - index,
    }));

    if (!trimmed) {
      const favoriteKeys = new Set(favorites.map((item) => favoriteKey(item)));
      const recentCommands: RankedCommand[] = recents
        .filter((item) => !favoriteKeys.has(favoriteKey(item)))
        .map((item, index) => ({
          ...resolvePinnedToCommand(item, indexes.byCommandId, indexes.byObjectKey),
          score: 1500 - index,
        }));

      const usedIds = new Set([
        ...favoriteCommands.map((command) => command.id),
        ...recentCommands.map((command) => command.id),
      ]);
      const browseClean = commands
        .filter((command) => !BROWSE_HIDDEN_TYPES.has(command.objectType))
        .filter((command) => !usedIds.has(command.id))
        .map((command) => ({ ...command, score: 1 }));

      const nextSections: ResultSection[] = [];
      if (favoriteCommands.length > 0) {
        nextSections.push({ key: "favorites", title: "Favorites", items: favoriteCommands });
      }
      if (recentCommands.length > 0) {
        nextSections.push({ key: "recent", title: "Recent", items: recentCommands });
      }
      nextSections.push(...sectionsFromSearchResults(browseClean));

      return {
        sections: nextSections,
        flat: nextSections.flatMap((section) => section.items),
      };
    }

    const matchedFavorites = favoriteCommands
      .map((command) => ({
        ...command,
        score: scoreCommand(trimmed, {
          label: command.label,
          subtitle: command.subtitle,
          keywords: command.keywords,
          initials: command.initials,
        }),
      }))
      .filter((command) => command.score > 0)
      .sort((a, b) => b.score - a.score);

    const favoriteIds = new Set(matchedFavorites.map((command) => command.id));

    const matched = commands
      .filter((command) => !favoriteIds.has(command.id))
      .map((command) => ({
        ...command,
        score: scoreCommand(trimmed, {
          label: command.label,
          subtitle: command.subtitle,
          keywords: command.keywords,
          initials: command.initials,
        }),
      }))
      .filter((command) => command.score > 0)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, 50);

    const nextSections: ResultSection[] = [];
    if (matchedFavorites.length > 0) {
      nextSections.push({ key: "favorites", title: "Favorites", items: matchedFavorites });
    }
    nextSections.push(...sectionsFromSearchResults(matched));

    return {
      sections: nextSections,
      flat: nextSections.flatMap((section) => section.items),
    };
  }, [commands, favorites, indexes, query, recents]);

  const clampedIndex = flat.length === 0 ? 0 : Math.min(activeIndex, flat.length - 1);
  const activeCommand = flat[clampedIndex];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      // Delete/Backspace must not unpin — leave for the search input / visible Unpin control.
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (flat.length === 0) return;
        setActiveIndex((index) => {
          const current = Math.min(index, flat.length - 1);
          return (current + 1) % flat.length;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (flat.length === 0) return;
        setActiveIndex((index) => {
          const current = Math.min(index, flat.length - 1);
          return (current - 1 + flat.length) % flat.length;
        });
        return;
      }

      if (event.key === "Enter") {
        const selected = flat[clampedIndex];
        if (!selected) return;
        event.preventDefault();
        runCommand(selected);
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [flat, clampedIndex, onClose, runCommand]);

  const emptyLabel = loadingIndex
    ? "Loading…"
    : query.trim()
      ? "No matching results"
      : "Type to search, or pin favorites for quick access";

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh] sm:pt-[12vh]">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-card border border-border bg-surface shadow-[0_24px_80px_rgba(17,24,39,0.18)]"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={2} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search people, pages, actions…"
            aria-controls={listId}
            aria-autocomplete="list"
            className="h-14 w-full bg-transparent text-base text-text-primary outline-none placeholder:text-text-secondary/80"
          />
          <kbd className="hidden rounded-control border border-border bg-app-background px-1.5 py-0.5 font-mono text-[10px] text-text-secondary sm:inline">
            esc
          </kbd>
        </div>

        <div className="flex min-h-0 max-h-[min(480px,58vh)]">
          <div
            id={listId}
            role="listbox"
            data-command-palette-scroll=""
            className="min-w-0 flex-1 overflow-y-auto overscroll-contain border-r border-border py-2"
          >
            {flat.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-secondary">{emptyLabel}</p>
            ) : (
              sections.map((section) => (
                <div key={section.key} className="mb-1">
                  <p className="px-4 py-1.5 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                    {section.title}
                  </p>
                  <ul>
                    {section.items.map((command) => {
                      runningIndex += 1;
                      const index = runningIndex;
                      const active = index === clampedIndex;
                      const Icon = command.icon;
                      const showUnpinHint = section.key === "favorites";
                      return (
                        <li key={`${section.key}:${command.id}`}>
                          <div
                            role="option"
                            aria-selected={active}
                            className={`flex w-full items-center gap-2 border-l-[3px] px-3 py-2 transition-colors ${
                              active
                                ? "border-[var(--module-accent)] bg-[var(--module-tint)]"
                                : "border-transparent hover:bg-app-background/70"
                            }`}
                            onMouseEnter={() => setActiveIndex(index)}
                          >
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-center gap-3 px-1 py-0.5 text-left"
                              onClick={() => runCommand(command)}
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-border bg-surface text-text-secondary">
                                {Icon ? <Icon className="h-4 w-4" strokeWidth={2} /> : null}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-text-primary">
                                  {showUnpinHint
                                    ? favoriteFromCommand(command).displayName
                                    : command.label}
                                </span>
                                {command.subtitle ? (
                                  <span className="block truncate text-xs text-text-secondary">
                                    {command.subtitle}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                            <PinToggleControl command={command} onToggle={handlePinToggle} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>

          <aside
            data-command-palette-scroll=""
            className="hidden w-[280px] shrink-0 overflow-y-auto overscroll-contain bg-app-background/40 md:block"
          >
            <CommandPreviewPanel command={activeCommand} />
          </aside>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-app-background/60 px-4 py-2.5">
          <p className="truncate text-xs text-text-secondary" role="status">
            {pending
              ? "Running…"
              : feedback
                ? feedback
                : "↑↓ navigate · Enter open · Pin to favorite · Esc close"}
          </p>
          <p className="shrink-0 font-mono text-[10px] text-text-secondary">⌘K</p>
        </div>
      </div>
    </div>
  );
}

export default function CommandPalette() {
  const { open, sessionId, setOpen } = useCommandPalette();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      warmCommandPalette();
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  if (!open) return null;

  return (
    <CommandPaletteDialog
      key={sessionId}
      sessionId={sessionId}
      onClose={() => setOpen(false)}
    />
  );
}
