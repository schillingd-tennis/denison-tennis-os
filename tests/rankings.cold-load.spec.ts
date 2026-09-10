import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "schillingd@denison.edu";
const PASSWORD = process.env.E2E_PASSWORD ?? "ChangeMe123!";
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const RANKINGS_ROUTES = [
  "/rankings/current-ita",
  "/rankings/live-ita",
  "/rankings/current-npi",
  "/rankings/live-npi",
] as const;

async function loginIfNeeded(page: Page) {
  await page.goto("/rankings/current-ita", { waitUntil: "networkidle" });
  if (!page.url().includes("/login")) return;
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
}

async function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" || /hydrat/i.test(text)) errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("Rankings cold-load desktop", () => {
  test.use({ viewport: DESKTOP });

  test("/rankings redirects to current-ita", async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto("/rankings", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/rankings\/current-ita\/?$/);
  });

  test("single sidebar Rankings link stays active; workspace tabs survive refresh", async ({
    page,
  }) => {
    await loginIfNeeded(page);
    await page.goto("/rankings/current-ita", { waitUntil: "networkidle" });

    const labels = await page.locator("aside nav > ul > li").evaluateAll((items) =>
      items.map((item) => {
        const control = item.querySelector(":scope > a, :scope > button");
        return control?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      }),
    );
    const recruitingIndex = labels.findIndex((label) => label === "Recruiting");
    const rankingsIndex = labels.findIndex((label) => label === "Rankings");
    const fundraisingIndex = labels.findIndex((label) => label === "Fundraising");
    expect(rankingsIndex).toBeGreaterThan(recruitingIndex);
    expect(fundraisingIndex).toBeGreaterThan(rankingsIndex);

    const rankingsLink = page.getByRole("link", { name: "Rankings", exact: true });
    await expect(rankingsLink).toHaveAttribute("href", "/rankings");
    await expect(page.getByRole("list", { name: "Rankings sections" })).toHaveCount(0);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Rankings", exact: true })).toBeVisible();
    await expect(rankingsLink).toBeVisible();
    await expect(page.getByRole("tab", { name: "Current ITA Rankings" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  for (const route of RANKINGS_ROUTES) {
    test(`desktop cold-load ${route}`, async ({ page }) => {
      const errors = await collectPageErrors(page);
      await loginIfNeeded(page);
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Rankings", exact: true })).toBeVisible();
      await expect(
        page.getByText("College tennis rankings and performance"),
      ).toBeVisible();
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });
      expect(overflow, `${route} should not overflow horizontally`).toBe(false);
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }

  test("current-ita shows real snapshot data and Denison highlight", async ({ page }) => {
    await loginIfNeeded(page);
    await page.goto("/rankings/current-ita", { waitUntil: "networkidle" });
    const summary = page.locator("[data-rankings-summary]").first();
    await expect(summary.getByText("NCAA Division III Men")).toBeVisible();
    await expect(summary.getByText("National Team Rankings")).toBeVisible();
    await expect(summary.getByText(/Jun(e)? 3, 2026/i)).toBeVisible();
    await expect(summary.getByText(/75 ranked teams/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "View ITA source" }).first()).toHaveAttribute(
      "href",
      /date=2026-06-03/,
    );
    const denison = page.locator('[data-denison="true"]');
    await expect(denison).toHaveCount(1);
    await expect(denison).toHaveAttribute("data-rank", "4");
    await expect(denison.getByText("Denison")).toBeVisible();
    await expect(denison.locator('img[alt="Denison logo"]')).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Points" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "WTN" })).toBeVisible();
    await expect(denison.getByRole("cell", { name: "78.23" })).toBeVisible();
    await expect(denison.getByRole("cell", { name: "11.96" })).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    const logoHealth = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("[data-rankings-row]"));
      const images = rows
        .map((row) => row.querySelector("img"))
        .filter((img): img is HTMLImageElement => Boolean(img));
      const broken = images.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.alt);
      const denisonImg = document.querySelector(
        '[data-denison="true"] img[alt="Denison logo"]',
      ) as HTMLImageElement | null;
      return {
        rowCount: rows.length,
        imageCount: images.length,
        broken,
        denisonSrc: denisonImg?.getAttribute("src") ?? null,
        denisonOk: Boolean(denisonImg && denisonImg.complete && denisonImg.naturalWidth > 0),
      };
    });
    expect(logoHealth.rowCount).toBe(75);
    expect(logoHealth.imageCount).toBeGreaterThanOrEqual(75);
    expect(logoHealth.broken).toEqual([]);
    expect(logoHealth.denisonSrc).toMatch(/school-logos%2FDenison_transparent\.png|\/school-logos\/Denison_transparent\.png/);
    expect(logoHealth.denisonOk).toBe(true);
  });

  test("placeholders do not invent ranking data", async ({ page }) => {
    await loginIfNeeded(page);
    for (const route of ["/rankings/live-ita", "/rankings/current-npi", "/rankings/live-npi"]) {
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page.getByText("Coming soon")).toBeVisible();
      await expect(page.locator("[data-rankings-row]")).toHaveCount(0);
      await expect(page.getByText(/75 ranked teams/i)).toHaveCount(0);
    }
  });
});

test.describe("Rankings cold-load mobile", () => {
  test.use({ viewport: MOBILE });

  for (const route of RANKINGS_ROUTES) {
    test(`mobile cold-load ${route}`, async ({ page }) => {
      const errors = await collectPageErrors(page);
      await loginIfNeeded(page);
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Rankings", exact: true })).toBeVisible();
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });
      expect(overflow, `${route} mobile overflow`).toBe(false);
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }
});
