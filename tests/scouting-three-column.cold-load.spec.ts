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

test("Scouting Opponent Players three-column Amherst Rex flow", async ({ page }) => {
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
});
