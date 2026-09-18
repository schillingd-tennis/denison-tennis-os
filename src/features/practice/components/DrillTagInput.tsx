"use client";

import { Tag, X } from "lucide-react";
import { useId, useState } from "react";
import { typeRole } from "@/components/typography";

function uniqueTags(values: string[]) {
  const seen = new Set<string>();
  return values.map((value) => value.trim()).filter((value) => {
    const key = value.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function DrillTagInput({ initialTags, suggestions }: { initialTags: string[]; suggestions: string[] }) {
  const [tags, setTags] = useState(() => uniqueTags(initialTags));
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const helpId = useId();
  const selected = new Set(tags.map((tag) => tag.toLocaleLowerCase()));
  const options = uniqueTags(suggestions).filter((tag) =>
    tag.toLocaleLowerCase().includes(draft.trim().toLocaleLowerCase()),
  );

  function addTags(value: string) {
    const additions = value.split(",").map((tag) => {
      const trimmed = tag.trim();
      return suggestions.find((option) => option.toLocaleLowerCase() === trimmed.toLocaleLowerCase()) ?? trimmed;
    });
    setTags((current) => uniqueTags([...current, ...additions]));
    setDraft("");
  }

  function toggleTag(tag: string) {
    setTags((current) => current.some((value) => value.toLocaleLowerCase() === tag.toLocaleLowerCase())
      ? current.filter((value) => value.toLocaleLowerCase() !== tag.toLocaleLowerCase())
      : [...current, tag]);
    setDraft("");
  }

  return (
    <fieldset className="grid min-w-0 gap-1.5">
      <legend className={`mb-1.5 ${typeRole.drawerFieldLabel}`}>Tags</legend>
      <input type="hidden" name="tags" value={tags.join(", ")} />
      <p id={helpId} className="text-[10px] font-normal text-text-secondary">Choose as many tags as needed. Tap a selected tag again to remove it, or add your own.</p>
      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">Find or add tags</label>
        <input id={inputId} value={draft} aria-describedby={helpId} autoComplete="off" enterKeyHint="done"
          onChange={(event) => {
            const value = event.target.value;
            if (value.endsWith(",")) addTags(value);
            else setDraft(value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              addTags(draft);
            }
          }}
          placeholder="Find or add tags…"
          className="min-h-11 min-w-0 flex-1 rounded-control border border-border bg-surface px-3 py-2 text-base text-text-primary outline-none focus:border-[var(--module-accent)] focus:ring-2 focus:ring-[var(--module-tint)] md:text-sm" />
        <button type="button" disabled={!draft.trim()} onClick={() => addTags(draft)}
          className="min-h-11 shrink-0 rounded-control border border-border bg-surface px-3 text-sm font-semibold disabled:opacity-40">Add tag</button>
      </div>
      {options.length > 0 ? (
        <div role="group" aria-label="Available tags" className="flex max-h-60 flex-wrap gap-1.5 overflow-y-auto overscroll-contain rounded-control border border-border bg-surface p-2">
          {options.map((tag) => {
            const isSelected = selected.has(tag.toLocaleLowerCase());
            return (
              <label key={tag}
                className={`inline-flex min-h-11 touch-manipulation cursor-pointer max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${isSelected ? "border-[var(--module-accent)]/30 bg-[var(--module-tint)] text-[var(--module-accent)]" : "border-border bg-app-background text-text-primary hover:bg-[var(--module-tint)]"}`}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleTag(tag)} className="h-4 w-4 shrink-0 accent-[var(--module-accent)]" />
                <span className="break-words">{tag}</span>
              </label>
            );
          })}
        </div>
      ) : <p className="text-[10px] font-normal text-text-secondary">{draft.trim() ? "No matching tags. Choose Add tag to create one." : "No suggested tags yet. Add your first tag above."}</p>}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Selected tags">
          {tags.map((tag) => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)} aria-label={`Remove ${tag}`}
              className="inline-flex min-h-11 touch-manipulation max-w-full items-center gap-1 rounded-full border border-[var(--module-accent)]/20 bg-[var(--module-tint)] px-2 py-1 text-[11px] font-semibold text-[var(--module-accent)] hover:bg-[var(--module-accent)]/10">
              <Tag className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="break-words">{tag}</span><X className="h-3 w-3 shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
