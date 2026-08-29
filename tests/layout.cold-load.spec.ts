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

type ModuleHeaderGeometry = {
  mainPaddingLeft: number;
  mainPaddingRight: number;
  titleLeft: number;
  titleTop: number;
  titleFontSize: number;
  titleFontWeight: string;
  titleLineHeight: number;
  subtitleMarginTop: number;
  subtitleFontSize: number;
  accentTop: number;
  accentHeight: number;
  accentLeft: number;
  actionTop: number;
  actionBottom: number;
  actionRight: number;
  headerToKpiGap: number;
};

const HEADER_TOLERANCE_PX = 3;

function expectHeaderMetric(actual: number, expected: number, label: string) {
  expect(
    Math.abs(actual - expected),
    `${label}: expected ${expected}, got ${actual}`,
  ).toBeLessThanOrEqual(HEADER_TOLERANCE_PX);
}

async function measureModulePageHeader(
  page: Page,
  kpiSelector: string,
): Promise<ModuleHeaderGeometry | null> {
  return page.evaluate((selector) => {
    const main = document.querySelector("main");
    if (!main) return null;
    const mainStyle = getComputedStyle(main);
    const shell = main.querySelector(":scope > div.flex.w-full.flex-col");
    if (!shell) return null;
    const headerRow = shell.firstElementChild;
    const titleBlock = headerRow?.querySelector(".relative.pl-4");
    const accent = titleBlock?.querySelector('span[aria-hidden="true"]');
    const title = titleBlock?.querySelector("h1");
    const subtitle = titleBlock?.querySelector("p");
    const action = headerRow?.querySelector("button");
    const kpi = document.querySelector(selector);
    if (!headerRow || !titleBlock || !title || !accent) return null;

    const titleStyle = getComputedStyle(title);
    const subtitleStyle = subtitle ? getComputedStyle(subtitle) : null;
    const headerRowRect = headerRow.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const accentRect = accent.getBoundingClientRect();
    const actionRect = action?.getBoundingClientRect();
    const kpiRect = kpi?.getBoundingClientRect();
    const titleLineHeight = Number.parseFloat(titleStyle.lineHeight);
    return {
      mainPaddingLeft: Number.parseFloat(mainStyle.paddingLeft),
      mainPaddingRight: Number.parseFloat(mainStyle.paddingRight),
      titleLeft: Math.round(titleRect.left),
      titleTop: Math.round(titleRect.top),
      titleFontSize: Number.parseFloat(titleStyle.fontSize),
      titleFontWeight: titleStyle.fontWeight,
      titleLineHeight: Number.isFinite(titleLineHeight) ? titleLineHeight : Math.round(titleRect.height),
      subtitleMarginTop: subtitleStyle ? Number.parseFloat(subtitleStyle.marginTop) : 0,
      subtitleFontSize: subtitleStyle ? Number.parseFloat(subtitleStyle.fontSize) : 0,
      accentTop: Math.round(accentRect.top),
      accentHeight: Math.round(accentRect.height),
      accentLeft: Math.round(accentRect.left),
      actionTop: actionRect ? Math.round(actionRect.top) : -1,
      actionBottom: actionRect ? Math.round(actionRect.bottom) : -1,
      actionRight: actionRect ? Math.round(actionRect.right) : -1,
      headerToKpiGap: kpiRect ? Math.round(kpiRect.top - headerRowRect.bottom) : -1,
    };
  }, kpiSelector);
}

function compareModuleHeaders(
  list: ModuleHeaderGeometry,
  dashboard: ModuleHeaderGeometry,
) {
  expectHeaderMetric(dashboard.mainPaddingLeft, list.mainPaddingLeft, "main padding left");
  expectHeaderMetric(dashboard.mainPaddingRight, list.mainPaddingRight, "main padding right");
  expectHeaderMetric(dashboard.titleLeft, list.titleLeft, "title left");
  expectHeaderMetric(dashboard.titleTop, list.titleTop, "title top");
  expect(dashboard.titleFontSize).toBe(list.titleFontSize);
  expect(dashboard.titleFontWeight).toBe(list.titleFontWeight);
  expectHeaderMetric(dashboard.titleLineHeight, list.titleLineHeight, "title line height");
  expectHeaderMetric(dashboard.subtitleMarginTop, list.subtitleMarginTop, "subtitle margin top");
  expect(dashboard.subtitleFontSize).toBe(list.subtitleFontSize);
  expectHeaderMetric(dashboard.accentTop, list.accentTop, "accent top");
  expectHeaderMetric(dashboard.accentHeight, list.accentHeight, "accent height");
  expectHeaderMetric(dashboard.accentLeft, list.accentLeft, "accent left");
  expectHeaderMetric(dashboard.actionTop, list.actionTop, "action top");
  expectHeaderMetric(dashboard.actionBottom, list.actionBottom, "action bottom");
  expectHeaderMetric(dashboard.actionRight, list.actionRight, "action right");
  expectHeaderMetric(dashboard.headerToKpiGap, list.headerToKpiGap, "header to KPI gap");
}

type ModuleHeaderTitleGeometry = {
  title: string;
  textTransform: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing: string;
  accentTop: number;
  accentHeight: number;
  accentLeft: number;
};

async function measureModuleHeaderTitle(page: Page): Promise<ModuleHeaderTitleGeometry | null> {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const shell = main?.querySelector(":scope > div.flex.w-full.flex-col");
    const titleBlock = shell?.querySelector(".relative.pl-4");
    const title = titleBlock?.querySelector("h1");
    const accent = titleBlock?.querySelector('span[aria-hidden="true"]');
    if (!title || !accent) return null;
    const titleStyle = getComputedStyle(title);
    const accentRect = accent.getBoundingClientRect();
    return {
      title: title.textContent?.trim() ?? "",
      textTransform: titleStyle.textTransform,
      fontSize: Number.parseFloat(titleStyle.fontSize),
      fontWeight: titleStyle.fontWeight,
      lineHeight: Number.parseFloat(titleStyle.lineHeight),
      letterSpacing: titleStyle.letterSpacing,
      accentTop: Math.round(accentRect.top),
      accentHeight: Math.round(accentRect.height),
      accentLeft: Math.round(accentRect.left),
    };
  });
}

function expectTitleTypographyMatches(
  reference: ModuleHeaderTitleGeometry,
  current: ModuleHeaderTitleGeometry,
  pageLabel: string,
) {
  expect(current.textTransform, `${pageLabel} text transform`).toBe(reference.textTransform);
  expect(current.fontSize, `${pageLabel} font size`).toBe(reference.fontSize);
  expect(current.fontWeight, `${pageLabel} font weight`).toBe(reference.fontWeight);
  expectHeaderMetric(current.lineHeight, reference.lineHeight, `${pageLabel} line height`);
  expect(current.letterSpacing, `${pageLabel} letter spacing`).toBe(reference.letterSpacing);
  expectHeaderMetric(current.accentTop, reference.accentTop, `${pageLabel} accent top`);
  expectHeaderMetric(current.accentHeight, reference.accentHeight, `${pageLabel} accent height`);
  expectHeaderMetric(current.accentLeft, reference.accentLeft, `${pageLabel} accent left`);
}

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

    const headerLayout = await page.evaluate(() => ({
      buttonCount: [...document.querySelectorAll("button")].filter((el) =>
        el.textContent?.trim() === "+ ADD RECRUIT",
      ).length,
    }));
    expect(headerLayout.buttonCount).toBe(1);

    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });

  test("dashboard header matches recruit list module page shell geometry", async ({ page }) => {
    const errors = await collectPageErrors(page);
    await loginIfNeeded(page);

    await page.goto("/recruiting/list", { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    const listHeader = await measureModulePageHeader(
      page,
      "main .max-md\\:hidden .grid.grid-cols-1",
    );
    expect(listHeader).not.toBeNull();

    await page.goto("/recruiting", { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    const dashboardHeader = await measureModulePageHeader(
      page,
      '[data-recruiting-dashboard-section="kpis"]',
    );
    expect(dashboardHeader).not.toBeNull();

    compareModuleHeaders(listHeader!, dashboardHeader!);

    const buttonCount = await page.evaluate(
      () =>
        [...document.querySelectorAll("button")].filter(
          (el) => el.textContent?.trim() === "+ ADD RECRUIT",
        ).length,
    );
    expect(buttonCount).toBe(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow, "dashboard desktop overflow").toBe(false);

    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });

  test("add recruit opens the canonical add-recruit drawer", async ({ page }) => {
    const errors = await collectPageErrors(page);
    await loginIfNeeded(page);
    await page.goto("/recruiting", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "+ ADD RECRUIT", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Add Recruit" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Creates a Person with role Recruit")).toBeVisible();
    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });

  test("module headers use title case and shared typography", async ({ page }) => {
    const errors = await collectPageErrors(page);
    await loginIfNeeded(page);

    const pages = [
      { href: "/players-coaches", title: "Team" },
      { href: "/recruiting", title: "Recruiting Dashboard" },
      { href: "/recruiting/list", title: "Recruiting" },
      { href: "/recruiting/tournaments", title: "Tournaments" },
      { href: "/recruiting/interactions", title: "Interactions" },
      { href: "/recruiting/log", title: "Log" },
    ] as const;

    let reference: ModuleHeaderTitleGeometry | null = null;

    for (const entry of pages) {
      await page.goto(entry.href, { waitUntil: "networkidle" });
      await page.reload({ waitUntil: "networkidle" });
      const measured = await measureModuleHeaderTitle(page);
      expect(measured, entry.href).not.toBeNull();
      expect(measured!.title, entry.href).toBe(entry.title);
      expect(measured!.title, entry.href).not.toBe(entry.title.toUpperCase());
      expect(measured!.textTransform, entry.href).not.toMatch(/uppercase/i);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflow, `${entry.href} overflow`).toBe(false);

      if (!reference) {
        reference = measured!;
      } else {
        expectTitleTypographyMatches(reference, measured!, entry.href);
      }
    }

    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });

  test("recent interactions metadata row keeps name, type, direction, and date aligned", async ({
    page,
  }) => {
    const errors = await collectPageErrors(page);
    await loginIfNeeded(page);
    await page.goto("/recruiting", { waitUntil: "networkidle" });

    const layout = await page.evaluate(() => {
      const section = document.querySelector('[data-recruiting-dashboard-section="recent-interactions"]');
      const meta = section?.querySelector("[data-dashboard-recent-interaction-meta]");
      const notes = section?.querySelector("[data-dashboard-recent-interaction-notes]");
      const firstItem = section?.querySelector("[data-dashboard-recent-list] > li");
      if (!meta || !notes || !firstItem) {
        return { ok: false, reason: "missing nodes" };
      }
      const metaRect = meta.getBoundingClientRect();
      const notesRect = notes.getBoundingClientRect();
      const name = meta.querySelector("a");
      const badge = meta.querySelector("span.rounded-full");
      const time = meta.querySelector("time");
      const nameRect = name?.getBoundingClientRect();
      const badgeRect = badge?.getBoundingClientRect();
      const timeRect = time?.getBoundingClientRect();
      if (!nameRect || !badgeRect || !timeRect) {
        return { ok: false, reason: "missing metadata parts" };
      }
      const sameRow =
        Math.abs(nameRect.top - badgeRect.top) < 8 &&
        Math.abs(nameRect.top - timeRect.top) < 8;
      const dateRight = timeRect.right <= metaRect.right + 1 && timeRect.left > nameRect.left;
      const notesBelow = notesRect.top >= metaRect.bottom - 2;
      return {
        ok: sameRow && dateRight && notesBelow,
        sameRow,
        dateRight,
        notesBelow,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });

    expect(layout.ok, JSON.stringify(layout)).toBe(true);
    expect(layout.overflow).toBe(false);

    await page.reload({ waitUntil: "networkidle" });
    const afterRefresh = await page.evaluate(() => {
      const section = document.querySelector('[data-recruiting-dashboard-section="recent-interactions"]');
      const meta = section?.querySelector("[data-dashboard-recent-interaction-meta]");
      const notes = section?.querySelector("[data-dashboard-recent-interaction-notes]");
      if (!meta || !notes) return { ok: false };
      return {
        ok: notes.getBoundingClientRect().top >= meta.getBoundingClientRect().bottom - 2,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    expect(afterRefresh.ok).toBe(true);
    expect(afterRefresh.overflow).toBe(false);

    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });
});

test.describe("mobile Recruiting Dashboard header", () => {
  test.use({ viewport: MOBILE });

  test("add recruit button does not cause horizontal overflow", async ({ page }) => {
    const errors = await collectPageErrors(page);
    await loginIfNeeded(page);
    await page.goto("/recruiting", { waitUntil: "networkidle" });

    const layout = await page.evaluate(() => ({
      buttonCount: [...document.querySelectorAll("button")].filter(
        (el) => el.textContent?.trim() === "+ ADD RECRUIT",
      ).length,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(layout.buttonCount).toBe(1);
    expect(layout.overflow).toBe(false);

    await page.reload({ waitUntil: "networkidle" });
    const afterRefresh = await page.evaluate(() => ({
      buttonCount: [...document.querySelectorAll("button")].filter(
        (el) => el.textContent?.trim() === "+ ADD RECRUIT",
      ).length,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    }));
    expect(afterRefresh.buttonCount).toBe(1);
    expect(afterRefresh.overflow).toBe(false);

    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });

  test("recent interactions metadata wraps without horizontal overflow", async ({ page }) => {
    const errors = await collectPageErrors(page);
    await loginIfNeeded(page);
    await page.goto("/recruiting", { waitUntil: "networkidle" });

    const layout = await page.evaluate(() => {
      const section = document.querySelector('[data-recruiting-dashboard-section="recent-interactions"]');
      const meta = section?.querySelector("[data-dashboard-recent-interaction-meta]");
      const notes = section?.querySelector("[data-dashboard-recent-interaction-notes]");
      return {
        hasMeta: Boolean(meta),
        notesBelow: meta && notes ? notes.getBoundingClientRect().top >= meta.getBoundingClientRect().bottom - 2 : false,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });

    expect(layout.hasMeta).toBe(true);
    expect(layout.notesBelow).toBe(true);
    expect(layout.overflow).toBe(false);

    expect(
      errors.filter((e) => /hydrat|did not match|Minified React error/i.test(e)),
      errors.join("\n"),
    ).toEqual([]);
  });

  test("dashboard header keeps canonical module shell behavior on mobile", async ({ page }) => {
    const errors = await collectPageErrors(page);
    await loginIfNeeded(page);

    const pages = [
      { href: "/players-coaches", title: "Team" },
      { href: "/recruiting", title: "Recruiting Dashboard" },
      { href: "/recruiting/list", title: "Recruiting" },
      { href: "/recruiting/tournaments", title: "Tournaments" },
      { href: "/recruiting/interactions", title: "Interactions" },
      { href: "/recruiting/log", title: "Log" },
    ] as const;

    for (const entry of pages) {
      await page.goto(entry.href, { waitUntil: "networkidle" });
      const measured = await measureModuleHeaderTitle(page);
      expect(measured, entry.href).not.toBeNull();
      expect(measured!.title, entry.href).toBe(entry.title);
      expect(measured!.textTransform, entry.href).not.toMatch(/uppercase/i);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflow, `${entry.href} overflow`).toBe(false);
    }

    await page.goto("/recruiting", { waitUntil: "networkidle" });
    const buttonCount = await page.evaluate(
      () =>
        [...document.querySelectorAll("button")].filter(
          (el) => el.textContent?.trim() === "+ ADD RECRUIT",
        ).length,
    );
    expect(buttonCount).toBe(1);

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
