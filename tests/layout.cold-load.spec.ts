import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "schillingd@denison.edu";
const PASSWORD = process.env.E2E_PASSWORD ?? "ChangeMe123!";
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

type Box = {
  display: string;
  columns: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type RecruitGeometry = {
  innerWidth: number;
  split: Box | null;
  identity: Box | null;
  academic: Box | null;
  interests: Box | null;
  schools: Box | null;
  aw: Array<Box & { cols: string | null; fieldTops: number[] }>;
};

async function loginIfNeeded(page: Page) {
  await page.goto("/recruiting", { waitUntil: "networkidle" });
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

async function openRecruitCard(page: Page) {
  await loginIfNeeded(page);
  await page.goto("/recruiting", { waitUntil: "networkidle" });
  const href = await page
    .locator('[aria-label="Top Ranked Recruits"] a')
    .first()
    .getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!, { waitUntil: "networkidle" });
}

async function measureRecruitCard(page: Page): Promise<RecruitGeometry> {
  return page.evaluate(() => {
    function box(el: Element | null): Box | null {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        display: s.display,
        columns: s.gridTemplateColumns,
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    }
    const grids = [...document.querySelectorAll("[data-aw-field-grid]")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    return {
      innerWidth: window.innerWidth,
      split: box(document.querySelector("[data-recruit-summary-split]")),
      identity: box(document.querySelector("[data-recruit-summary-identity]")),
      academic: box(document.querySelector("[data-recruit-summary-academic]")),
      interests: box(document.querySelector("[data-recruit-summary-academic-interests]")),
      schools: box(document.querySelector("[data-recruit-summary-schools]")),
      aw: grids.map((el) => {
        const kids = [...el.children].slice(0, 3).map((child) =>
          Math.round(child.getBoundingClientRect().y),
        );
        return {
          cols: el.getAttribute("data-aw-field-grid"),
          fieldTops: kids,
          ...box(el)!,
        };
      }),
    };
  });
}

function assertDesktopRecruit(geometry: RecruitGeometry) {
  expect(geometry.innerWidth).toBeGreaterThanOrEqual(1440);
  expect(geometry.split?.display).toBe("grid");
  expect(geometry.split?.columns.split(" ").filter(Boolean).length).toBe(2);
  expect(geometry.identity).toBeTruthy();
  expect(geometry.academic).toBeTruthy();
  expect(geometry.interests).toBeTruthy();
  expect(geometry.schools).toBeTruthy();
  expect(geometry.academic!.x).toBeGreaterThan(geometry.identity!.x + geometry.identity!.w - 8);
  expect(geometry.interests!.x).toBeGreaterThan(geometry.identity!.x);
  expect(geometry.schools!.x).toBeGreaterThan(geometry.identity!.x);
  expect(Math.abs(geometry.interests!.x - geometry.schools!.x)).toBeLessThan(8);
  expect(geometry.schools!.y).toBeGreaterThan(geometry.interests!.y);
  expect(geometry.academic!.w).toBeGreaterThan(280);
  expect(geometry.identity!.w).toBeGreaterThan(200);
  expect(geometry.identity!.w).toBeLessThanOrEqual(360);
  const threeCol = geometry.aw.find((g) => g.cols === "3");
  expect(threeCol, "Personal Info AW must keep a 3-column desktop grid").toBeTruthy();
  expect(threeCol!.columns.split(" ").filter(Boolean).length).toBeGreaterThanOrEqual(3);
  expect(
    threeCol!.fieldTops.length >= 2 &&
      Math.abs(threeCol!.fieldTops[0]! - threeCol!.fieldTops[1]!) < 6,
    "multiple AW fields must share the same desktop row",
  ).toBeTruthy();
}

function assertMobileRecruit(geometry: RecruitGeometry) {
  expect(geometry.innerWidth).toBeLessThan(768);
  expect(geometry.split?.display).toBe("grid");
  expect(geometry.split?.columns.split(" ").filter(Boolean).length).toBe(1);
  expect(geometry.academic!.y).toBeGreaterThan(geometry.identity!.y);
  expect(Math.abs(geometry.academic!.x - geometry.identity!.x)).toBeLessThan(24);
  expect(geometry.schools!.y).toBeGreaterThan(geometry.interests!.y);
  const threeCol = geometry.aw.find((g) => g.cols === "3");
  expect(threeCol).toBeTruthy();
  expect(threeCol!.columns.split(" ").filter(Boolean).length).toBe(1);
}

test.describe("desktop Recruit Card lock", () => {
  test.use({ viewport: DESKTOP });

  test("direct load, hydration, and refresh keep the locked desktop composition", async ({
    page,
  }) => {
    const errors = await collectPageErrors(page);
    await openRecruitCard(page);
    const first = await measureRecruitCard(page);
    assertDesktopRecruit(first);

    await page.reload({ waitUntil: "networkidle" });
    const second = await measureRecruitCard(page);
    assertDesktopRecruit(second);

    expect(Math.abs(first.identity!.w - second.identity!.w)).toBeLessThan(8);
    expect(Math.abs(first.academic!.x - second.academic!.x)).toBeLessThan(8);
    expect(Math.abs(first.interests!.x - second.interests!.x)).toBeLessThan(8);
    expect(Math.abs(first.schools!.y - second.schools!.y)).toBeLessThan(12);
    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });
});

test.describe("desktop Recruiting Dashboard lock", () => {
  test.use({ viewport: DESKTOP });

  test("direct load and refresh keep the two-column dashboard", async ({ page }) => {
    const errors = await collectPageErrors(page);
    await loginIfNeeded(page);
    await page.goto("/recruiting", { waitUntil: "networkidle" });
    const measure = () =>
      page.evaluate(() => {
        const grid = document.querySelector("[data-recruiting-dashboard-grid]");
        const recent = document.querySelector('[aria-label="Recent Interactions"]');
        const ranked = document.querySelector('[aria-label="Top Ranked Recruits"]');
        function box(el: Element | null) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            display: getComputedStyle(el).display,
            columns: getComputedStyle(el).gridTemplateColumns,
            x: Math.round(r.x),
            w: Math.round(r.width),
          };
        }
        return { innerWidth: innerWidth, grid: box(grid), recent: box(recent), ranked: box(ranked) };
      });
    const first = await measure();
    expect(first.innerWidth).toBeGreaterThanOrEqual(1440);
    expect(first.grid?.display).toBe("grid");
    expect(first.grid?.columns.split(" ").filter(Boolean).length).toBe(2);
    expect(first.recent!.x).toBeLessThan(first.ranked!.x);
    expect(first.recent!.w).toBeLessThan(1100);

    await page.reload({ waitUntil: "networkidle" });
    const second = await measure();
    expect(second.grid?.display).toBe("grid");
    expect(second.recent!.x).toBeLessThan(second.ranked!.x);

    const readTopRanked = () =>
      page.evaluate(() => {
        const section = document.querySelector('[data-recruiting-dashboard-section="top-ranked"]');
        if (!section) return { count: 0, classYears: [] as string[] };
        const items = [...section.querySelectorAll("ol li")];
        const classYears = items.map((li) => {
          const meta = li.querySelector("p")?.textContent?.trim() ?? "";
          return meta.split("·")[0]?.trim() ?? "";
        });
        return { count: items.length, classYears };
      });

    const topRanked = await readTopRanked();
    expect(topRanked.count).toBeLessThanOrEqual(5);
    for (const year of topRanked.classYears) {
      if (year) expect(year).toBe("2027");
    }

    await page.reload({ waitUntil: "networkidle" });
    const topRankedAfterRefresh = await readTopRanked();
    expect(topRankedAfterRefresh.count).toBeLessThanOrEqual(5);
    for (const year of topRankedAfterRefresh.classYears) {
      if (year) expect(year).toBe("2027");
    }

    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });
});

test.describe("mobile Recruit Card must not rewrite desktop composition", () => {
  test.use({ viewport: MOBILE });

  test("mobile stacks summary and AW fields without moving locked slots", async ({ page }) => {
    const errors = await collectPageErrors(page);
    await openRecruitCard(page);
    const geometry = await measureRecruitCard(page);
    assertMobileRecruit(geometry);

    await page.reload({ waitUntil: "networkidle" });
    assertMobileRecruit(await measureRecruitCard(page));

    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });
});
