import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "schillingd@denison.edu";
const PASSWORD = process.env.E2E_PASSWORD ?? "ChangeMe123!";
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function loginIfNeeded(page: Page) {
  await page.goto("/recruiting", { waitUntil: "networkidle" });
  if (!page.url().includes("/login")) return;
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
}

async function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" || /hydrat/i.test(text)) errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function openRecruitLog(page: Page) {
  await loginIfNeeded(page);
  await page.goto("/recruiting", { waitUntil: "networkidle" });
  const href = await page.locator('[aria-label="Top Ranked Recruits"] a').first().getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(`${href}?workspace=log`, { waitUntil: "networkidle" });
}

test.describe("desktop Recruit Log and central Log", () => {
  test.use({ viewport: DESKTOP });

  test("recruit Log, central Log, dashboard, and locked geometry", async ({ page }) => {
    const errors = await collectErrors(page);
    await openRecruitLog(page);
    await expect(page.locator("[data-recruit-change-log]").locator("visible=true")).toBeVisible();
    await expect(page.getByText("Updates this month").locator("visible=true")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Add Log");

    await page.goto("/recruiting/log", { waitUntil: "networkidle" });
    await expect(page.locator("main").getByRole("heading", { name: "Log", exact: true })).toBeVisible();
    await expect(page.getByText("Updates today")).toBeVisible();
    await page.goto("/recruiting/log?period=today", { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    expect(page.url()).toContain("period=today");

    await page.goto("/recruiting", { waitUntil: "networkidle" });
    await expect(page.locator("main").getByRole("heading", { name: "Recruiting Dashboard", exact: true })).toBeVisible();
    await expect(page.getByText("Your recruiting command center")).toBeVisible();
    await expect(page.getByRole("region", { name: "Recent Updates" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View all updates" })).toHaveAttribute("href", "/recruiting/log");
    await expect(page.getByRole("region", { name: "Recent Interactions" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    expect(errors.filter((item) => /hydrat|did not match|Minified React error/i.test(item))).toEqual([]);
  });
});

test.describe("mobile Recruit Log and central Log", () => {
  test.use({ viewport: MOBILE });

  test("mobile stacks without overflow or hydration errors", async ({ page }) => {
    const errors = await collectErrors(page);
    await openRecruitLog(page);
    await expect(page.getByText("Updates this month").locator("visible=true")).toBeVisible();
    await page.goto("/recruiting/log", { waitUntil: "networkidle" });
    await expect(page.locator("main").getByRole("heading", { name: "Log", exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    expect(errors.filter((item) => /hydrat|did not match|Minified React error/i.test(item))).toEqual([]);
  });
});
