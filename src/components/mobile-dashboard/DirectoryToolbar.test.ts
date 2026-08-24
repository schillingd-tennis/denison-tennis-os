import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DIRECTORY_TOOLBAR_CLASS,
  DIRECTORY_TOOLBAR_FILTERS_SLOT_CLASS,
  DIRECTORY_TOOLBAR_PRIMARY_ROW_CLASS,
  DIRECTORY_TOOLBAR_SEARCH_SLOT_CLASS,
  DIRECTORY_TOOLBAR_VIEWS_SLOT_CLASS,
} from "./DirectoryToolbar";

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, "../..");
const repoRoot = join(here, "../../..");

function tokens(className: string): string[] {
  return className.split(/\s+/).filter(Boolean);
}

function readSrc(relativePath: string): string {
  return readFileSync(join(srcRoot, relativePath), "utf8");
}

test("desktop directory toolbar: Search left flex, Views compact right, Filters next row", () => {
  const root = tokens(DIRECTORY_TOOLBAR_CLASS);
  const row = tokens(DIRECTORY_TOOLBAR_PRIMARY_ROW_CLASS);
  const search = tokens(DIRECTORY_TOOLBAR_SEARCH_SLOT_CLASS);
  const views = tokens(DIRECTORY_TOOLBAR_VIEWS_SLOT_CLASS);
  const filters = tokens(DIRECTORY_TOOLBAR_FILTERS_SLOT_CLASS);

  assert.ok(root.includes("flex"));
  assert.ok(root.includes("flex-col"), "Search/Views row then Filters as the next flex-col child");

  assert.ok(row.includes("flex"));
  assert.ok(row.includes("flex-nowrap"), "Search and Views must not wrap");
  assert.ok(row.includes("items-center"));
  assert.equal(row.includes("flex-col"), false, "desktop-first: do not default the primary row to a column");
  assert.equal(
    row.some((token) => token.startsWith("md:flex-row") || token.startsWith("md:flex-col")),
    false,
    "do not depend on md:flex-row — that utility often fails to generate",
  );

  assert.ok(search.includes("flex-1"));
  assert.ok(search.includes("min-w-0"));
  assert.equal(
    search.some((token) => token.startsWith("max-w-")),
    false,
    "Search uses remaining width; do not cap with max-w-*",
  );

  assert.ok(views.includes("shrink-0"), "Views keep compact intrinsic width");
  assert.ok(views.includes("ml-auto"), "Views pin to the right of the Search row");
  assert.ok(views.includes("max-md:hidden"), "desktop-only Views; mobile lives in MobileDirectoryControls");
  assert.equal(views.includes("flex-1"), false, "Views must not grow");
  assert.equal(views.includes("sticky"), false, "Views are not position:sticky");

  assert.ok(filters.includes("w-full"));
  assert.ok(filters.includes("min-w-0"));
});

test("Search and Views share the primary row; Views is not in the filter region", () => {
  const source = readSrc("components/mobile-dashboard/DirectoryToolbar.tsx");
  assert.match(source, /data-directory-toolbar-primary-row/);
  assert.match(source, /data-directory-toolbar-search/);
  assert.match(source, /data-directory-toolbar-views/);
  assert.match(source, /data-directory-toolbar-filters/);

  const primaryStart = source.indexOf("data-directory-toolbar-primary-row");
  const filtersStart = source.indexOf("data-directory-toolbar-filters");
  const viewsStart = source.indexOf("data-directory-toolbar-views");
  const searchStart = source.indexOf("data-directory-toolbar-search");
  assert.ok(primaryStart > 0 && searchStart > primaryStart && viewsStart > searchStart);
  assert.ok(viewsStart < filtersStart, "Views must sit in the primary row, not the filter region");
});

test("unlayered CSS locks desktop Search + Views to one row", () => {
  const css = readFileSync(join(repoRoot, "src/app/layout-lock.css"), "utf8");
  assert.match(css, /\[data-directory-toolbar-primary-row\]/);
  assert.match(css, /flex-direction:\s*row/);
  assert.match(css, /flex-wrap:\s*nowrap/);
  assert.match(css, /\[data-directory-toolbar-search\]/);
  assert.match(css, /flex:\s*1 1 0%/);
  assert.match(css, /\[data-directory-toolbar-views\]/);
  assert.match(css, /margin-left:\s*auto/);
  assert.match(css, /@media \(max-width:\s*767px\)/);
});

test("Search + Views directories use DirectoryToolbar instead of a forked layout", () => {
  const consumers = [
    "features/recruiting/components/RecruitingDirectory.tsx",
    "features/people/components/PeopleDirectory.tsx",
    "features/tournaments/components/TournamentsDashboard.tsx",
    "features/interactions/components/InteractionsDashboard.tsx",
  ];

  for (const relativePath of consumers) {
    const source = readSrc(relativePath);
    assert.match(
      source,
      /from "@\/components\/mobile-dashboard"/,
      `${relativePath} should import from the shared mobile-dashboard package`,
    );
    assert.match(source, /DirectoryToolbar/, `${relativePath} should render DirectoryToolbar`);
    assert.equal(
      /md:max-w-xl/.test(source),
      false,
      `${relativePath} must not cap Search with max-w-xl`,
    );
    assert.equal(
      /md:flex-row/.test(source),
      false,
      `${relativePath} must not fork desktop Search/Views positioning`,
    );
  }
});
