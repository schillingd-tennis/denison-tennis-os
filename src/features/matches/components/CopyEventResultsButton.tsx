"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy failed");
}

export default function CopyEventResultsButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copyResults() {
    try {
      await copyText(text);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
    }
  }

  const Icon = state === "copied" ? Check : Copy;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copyResults}
        className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-xs font-semibold hover:bg-app-background"
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {state === "copied" ? "Copied all results" : "Copy all results"}
      </button>
      {state === "error" ? (
        <span className="text-xs text-red-700">Could not copy. Please try again.</span>
      ) : null}
    </div>
  );
}
