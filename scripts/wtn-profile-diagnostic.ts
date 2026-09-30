#!/usr/bin/env tsx
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium, type Response } from "playwright";

const REPO_ROOT = join(import.meta.dirname, "..");
const PROFILE_DIR = join(REPO_ROOT, ".local/wtn-browser-profile");
const REPORT_FILE = join(REPO_ROOT, ".local/wtn-diagnostic.json");
const SCREENSHOT_FILE = join(REPO_ROOT, ".local/wtn-diagnostic.png");
const DEFAULT_PROFILE =
  "https://worldtennisnumber.com/eng/player-profile?id=61947e4e40b7f25e922d7a3f";

type RatingClue = { path: string; value: string | number | boolean | null };

function collectRatingClues(value: unknown, path = "root", output: RatingClue[] = []): RatingClue[] {
  if (output.length >= 100 || value == null) return output;
  if (Array.isArray(value)) {
    value.slice(0, 25).forEach((item, index) => collectRatingClues(item, `${path}[${index}]`, output));
    return output;
  }
  if (typeof value !== "object") return output;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    if (
      /(?:tennisNumber|worldTennisNumber|rating|confidence|singles|doubles|type)/i.test(key) &&
      (child == null || ["string", "number", "boolean"].includes(typeof child))
    ) {
      output.push({ path: childPath, value: child as RatingClue["value"] });
    }
    collectRatingClues(child, childPath, output);
    if (output.length >= 100) break;
  }
  return output;
}

async function inspectResponse(response: Response): Promise<{
  url: string;
  status: number;
  clues: RatingClue[];
} | null> {
  const type = response.request().resourceType();
  const contentType = response.headers()["content-type"] ?? "";
  if (!['xhr', 'fetch'].includes(type) || !contentType.includes("json")) return null;
  try {
    const clues = collectRatingClues(await response.json());
    return clues.length ? { url: response.url(), status: response.status(), clues } : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const targetUrl = process.argv[2] ?? DEFAULT_PROFILE;
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1440, height: 1000 },
  });
  const page = context.pages()[0] ?? await context.newPage();
  const networkCandidates: Array<{ url: string; status: number; clues: RatingClue[] }> = [];

  page.on("response", (response) => {
    void inspectResponse(response).then((candidate) => {
      if (candidate) networkCandidates.push(candidate);
    });
  });

  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(10_000);
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const relevantText = bodyText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /(?:world tennis number|WTN|singles|doubles|sign in|log in)/i.test(line))
    .slice(0, 80);

  await page.screenshot({ path: SCREENSHOT_FILE, fullPage: true });
  const report = {
    inspectedAt: new Date().toISOString(),
    targetUrl,
    finalUrl: page.url(),
    title: await page.title(),
    signInVisible: /(?:sign in|log in)/i.test(bodyText),
    relevantText,
    networkCandidates,
  };
  writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await context.close();

  console.log(`WTN diagnostic complete: ${networkCandidates.length} rating data request(s) found.`);
  console.log(`Report: ${REPORT_FILE}`);
  console.log(`Screenshot: ${SCREENSHOT_FILE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
