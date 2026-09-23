import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "schillingd@denison.edu";
const PASSWORD = process.env.E2E_PASSWORD ?? "ChangeMe123!";

async function loginIfNeeded(page: Page) {
  if (!page.url().includes("/login")) return;
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
}

test("Scouting Teams and Opponents three-column flows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/team-operations/scouting");
  await loginIfNeeded(page);
  await page.goto("/team-operations/scouting");

  const desktop = page.locator("[data-scouting-desktop-columns]");
  await expect(desktop).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-scouting-team-column]")).toBeVisible();
  await expect(page.locator("[data-scouting-player-column]")).toBeVisible();
  await expect(page.locator("[data-scouting-report-column]")).toBeVisible();

  const display = await desktop.evaluate((el) => getComputedStyle(el).display);
  expect(display).toBe("grid");

  const desktopNav = desktop.locator("[data-scouting-team-nav]");
  const desktopPlayers = desktop.locator("[data-scouting-player-column]");
  const desktopReports = desktop.locator("[data-scouting-report-column]");

  await desktopNav.getByRole("button", { name: /Amherst/i }).click();
  await expect(desktopPlayers.getByText("Rex Harrison")).toBeVisible();

  await desktopPlayers.getByText("Rex Harrison").first().click();
  await expect(desktopReports).toContainText("Rex Harrison");
  await expect(desktopReports.getByRole("button", { name: /Open player card/i })).toBeVisible();
  await expect(page.locator("[data-scouting-player-card]")).toHaveCount(0);

  await desktopReports.getByRole("button", { name: /Open player card/i }).click();
  await expect(page.locator("[data-scouting-player-card]")).toBeVisible();
  await expect(page.locator("[data-scouting-overview-summary-cards]:visible")).toBeVisible();
  await expect(page.getByText("Quick AI Scouting Report").locator("visible=true")).toBeVisible();

  await page.getByRole("button", { name: /Back to Teams/i }).click();
  await page
    .getByRole("navigation", { name: /Scouting sections/i })
    .getByRole("button", { name: /^Opponents$/i })
    .click();
  const opponents = page.locator("[data-scouting-opponents-columns]");
  await expect(opponents).toBeVisible();
  await expect(opponents.getByText(/Opponents ·/i)).toBeVisible();
  await expect(opponents.getByText(/Records ·/i)).toBeVisible();
  await expect(page.locator("[data-scouting-opponent-report-column]")).toBeVisible();
});

test("Scouting Match Reports Needs Review and Form Submissions audit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/team-operations/scouting");
  await loginIfNeeded(page);
  await page.goto("/team-operations/scouting");

  await page.getByRole("navigation", { name: /Scouting sections/i }).getByRole("button", { name: /^Match Reports$/i }).click();
  const reportsView = page.locator("[data-scouting-match-reports-view]");
  await expect(reportsView).toBeVisible({ timeout: 30_000 });

  const needsReview = page.locator("[data-scouting-needs-review-card]");
  const needsReviewCount = await needsReview.count();
  if (needsReviewCount > 0) {
    await expect(needsReview.first()).toContainText(/Needs Review/i);
    const box = await needsReview.first().boundingBox();
    expect(box).toBeTruthy();
    expect((box?.width ?? 0) > 0).toBeTruthy();
    await needsReview.first().click();
    await expect(page.locator("[data-scouting-submission-card]")).toBeVisible();
    await expect(page.locator("[data-scouting-submission-review]")).toBeVisible();
    await expect(page.getByRole("button", { name: /Review & Publish/i })).toBeVisible();
  }

  await page.getByRole("navigation", { name: /Scouting sections/i }).getByRole("button", { name: /^Form Submissions$/i }).click();
  const submissionsView = page.locator("[data-scouting-submissions-view]");
  await expect(submissionsView).toBeVisible({ timeout: 30_000 });
  // Recovery control appears only when unpromoted rows exist (optional in empty envs).
  const reprocess = page.locator("[data-scouting-reprocess-unpromoted]");
  if ((await reprocess.count()) > 0) {
    await expect(reprocess.getByRole("button", { name: /Reprocess unpromoted submissions/i })).toBeVisible();
  }
  const preview = page.locator("[data-scouting-submission-preview]");
  if ((await preview.count()) > 0) {
    await preview.first().click();
    await expect(page.locator("[data-scouting-submission-card]")).toBeVisible();
  }

  // Mobile: no horizontal overflow on Match Reports
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/team-operations/scouting");
  await page.getByRole("navigation", { name: /Scouting sections/i }).getByRole("button", { name: /^Match Reports$/i }).click();
  await expect(page.locator("[data-scouting-match-reports-view]")).toBeVisible({ timeout: 30_000 });
  const overflowX = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });
  expect(overflowX).toBe(false);
});
