import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "schillingd@denison.edu";
const PASSWORD = process.env.E2E_PASSWORD ?? "ChangeMe123!";
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const DENISON_RED = { r: 200, g: 16, b: 46 };
const OS_BLUE = { r: 37, g: 99, b: 235 };

async function loginIfNeeded(page: Page) {
  await page.goto("/recruiting/interactions", { waitUntil: "networkidle" });
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

function rgb(color: string | null | undefined) {
  const match = color?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

async function measureHeaderActions(page: Page) {
  return page.evaluate(() => {
    const add = document.querySelector("[data-interactions-add-interaction]");
    const sync = document.querySelector("[data-interactions-sync-messages]");
    const addStyle = add ? getComputedStyle(add) : null;
    const syncStyle = sync ? getComputedStyle(sync) : null;
    const addBox = add?.getBoundingClientRect();
    const syncBox = sync?.getBoundingClientRect();
    const spinner = sync?.querySelector("svg");
    return {
      addTag: add?.tagName ?? "",
      syncTag: sync?.tagName ?? "",
      addBg: addStyle?.backgroundColor ?? "",
      syncBg: syncStyle?.backgroundColor ?? "",
      addH: addBox?.height ?? 0,
      syncH: syncBox?.height ?? 0,
      addPad: Number.parseFloat(addStyle?.paddingLeft ?? "0"),
      syncPad: Number.parseFloat(syncStyle?.paddingLeft ?? "0"),
      addX: addBox?.x ?? 0,
      addY: addBox?.y ?? 0,
      addW: addBox?.width ?? 0,
      syncX: syncBox?.x ?? 0,
      syncY: syncBox?.y ?? 0,
      spinnerInside: Boolean(spinner && sync?.contains(spinner)),
      syncText: (sync?.textContent ?? "").replace(/\s+/g, " ").trim(),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

function assertDesktopHeader(metrics: Awaited<ReturnType<typeof measureHeaderActions>>) {
  expect(metrics.addTag).toBe("BUTTON");
  expect(metrics.syncTag).toBe("BUTTON");
  expect(rgb(metrics.addBg)).toEqual(DENISON_RED);
  expect(rgb(metrics.syncBg)).toEqual(OS_BLUE);
  expect(metrics.addH).toBeGreaterThanOrEqual(40);
  expect(metrics.syncH).toBeGreaterThanOrEqual(40);
  expect(metrics.addPad).toBeGreaterThanOrEqual(12);
  expect(metrics.syncPad).toBeGreaterThanOrEqual(12);
  expect(Math.abs(metrics.addY - metrics.syncY)).toBeLessThan(8);
  expect(metrics.syncX).toBeGreaterThan(metrics.addX + metrics.addW - 2);
  expect(metrics.syncText).toBe("Sync Messages");
  expect(metrics.syncText).not.toContain("Syncing");
}

test.describe("desktop central Interactions page", () => {
  test.use({ viewport: DESKTOP });

  test("direct load and refresh keep styled header actions and two-column layout", async ({ page }) => {
    const errors = await collectPageErrors(page);
    await loginIfNeeded(page);
    await page.goto("/recruiting/interactions", { waitUntil: "networkidle" });
    await expect(page.getByRole("main").getByRole("heading", { name: "Interactions", exact: true })).toBeVisible();
    const first = await measureHeaderActions(page);
    assertDesktopHeader(first);
    await page.reload({ waitUntil: "networkidle" });
    const second = await measureHeaderActions(page);
    assertDesktopHeader(second);
    await expect(page.getByRole("heading", { name: "Communication Alerts" })).toBeVisible();
    await expect(page.locator("[data-interactions-insights]").getByRole("button", { name: "Sync Messages" })).toHaveCount(0);
    const layout = page.locator("[data-interactions-layout]");
    await expect(layout).toBeVisible();
    const geometry = await page.evaluate(() => {
      const grid = document.querySelector("[data-interactions-layout]");
      const history = document.querySelector("[data-interactions-layout] > section");
      const aside = document.querySelector("[data-interactions-layout] > aside");
      const style = grid ? getComputedStyle(grid) : null;
      return {
        columns: style?.gridTemplateColumns ?? "",
        historyX: history?.getBoundingClientRect().x ?? 0,
        asideX: aside?.getBoundingClientRect().x ?? 0,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    expect(geometry.columns.split(" ").filter(Boolean).length).toBe(2);
    expect(geometry.historyX).toBeLessThan(geometry.asideX);
    expect(geometry.overflow).toBe(false);
    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });
});

test.describe("mobile central Interactions page", () => {
  test.use({ viewport: MOBILE });

  test("mobile keeps both header buttons without overflow or a stuck Syncing state", async ({ page }) => {
    const errors = await collectPageErrors(page);
    await loginIfNeeded(page);
    await page.goto("/recruiting/interactions", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "+ Add Interaction" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sync Messages" })).toBeVisible();
    const metrics = await measureHeaderActions(page);
    expect(rgb(metrics.addBg)).toEqual(DENISON_RED);
    expect(rgb(metrics.syncBg)).toEqual(OS_BLUE);
    expect(metrics.overflow).toBe(false);
    expect(metrics.syncText).toBe("Sync Messages");
    expect(metrics.syncText).not.toContain("Syncing");
    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });
});
