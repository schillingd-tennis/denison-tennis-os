"use client";

import { useEffect, useState } from "react";

import type { TodayBetaPlayerRow } from "../types";

function buildUtrResultsUrl(player: TodayBetaPlayerRow): string | null {
  if (!player.utrResultsUrl) return null;
  const url = new URL(player.utrResultsUrl);
  if (player.recruitPersonId) {
    url.searchParams.set("dtenPersonId", player.recruitPersonId);
  }
  return url.toString();
}

const INSTALLED_VALUES = new Set(["installed", "chrome-installed", "safari-installed"]);

function readExtensionInstalled(): boolean {
  if (typeof document === "undefined") return false;
  const value = document.documentElement.dataset.denisonUtrExtension;
  return Boolean(value && INSTALLED_VALUES.has(value));
}

function extensionLabel(): string | null {
  if (typeof document === "undefined") return null;
  const value = document.documentElement.dataset.denisonUtrExtension;
  if (value === "chrome-installed") return "Chrome";
  if (value === "safari-installed" || value === "installed") return "Safari";
  return null;
}

export default function UtrCaptureInstructions({
  player,
}: {
  player: TodayBetaPlayerRow;
}) {
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [browserKind, setBrowserKind] = useState<string | null>(null);
  const resultsUrl = buildUtrResultsUrl(player);

  useEffect(() => {
    function sync() {
      setExtensionInstalled(readExtensionInstalled());
      setBrowserKind(extensionLabel());
    }
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-denison-utr-extension"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-3 text-sm text-text-secondary">
      <div className="rounded-control border border-border/80 bg-background px-3 py-2">
        <p className="font-medium text-text-primary">UTR Browser Helper</p>
        <p className="mt-1">
          Browser Helper:{" "}
          <span
            className={
              extensionInstalled ? "font-semibold text-green-700" : "font-semibold text-amber-700"
            }
          >
            {extensionInstalled
              ? `Installed${browserKind ? ` (${browserKind})` : ""}`
              : "Not detected"}
          </span>
        </p>
        {!extensionInstalled ? (
          <p className="mt-1 text-xs">
            Install the Chrome extension: load unpacked folder{" "}
            <code className="text-xs">browser-extensions/denison-utr-capture/chrome</code> — see{" "}
            <code className="text-xs">chrome/README.md</code>.
          </p>
        ) : null}
      </div>

      <p>
        The browser extension sends structured match data from your open UTR Results tab to Denison
        Tennis OS. Credentials stay in the browser — only tennis results are imported.
      </p>

      <ol className="list-decimal space-y-2 pl-5">
        <li>
          Open{" "}
          {resultsUrl ? (
            <a
              href={resultsUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--module-accent)] hover:underline"
            >
              {player.displayName}&apos;s UTR Results
            </a>
          ) : (
            "the recruit UTR Results page"
          )}{" "}
          while logged into UTR in the same browser.
        </li>
        <li>
          Click{" "}
          <span className="font-medium text-text-primary">Send Results to Denison OS</span> on the
          Denison UTR Capture toolbar button.
        </li>
        <li>Return here to review any new results or check status.</li>
      </ol>

      <p className="text-xs text-text-secondary">
        Failed captures do not mark the recruit checked today. Common issues: not signed into UTR,
        Denison OS not running on localhost:3000, or not signed into Denison in the same browser.
      </p>
    </div>
  );
}

export { buildUtrResultsUrl };
