import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SOURCE = "https://denisontennis.netlify.app/records/record-book";
const OUTPUT = resolve("public/data/record-book.json");
const sectionIds = [
  "latest-season", "championship", "glance", "team-records", "career", "season",
  "coaches", "national", "awards", "all-ncac", "postseason", "ncaa", "opponents",
  "results", "letters",
];

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`Record Book download failed: ${response.status}`);
const source = await response.text();

function sectionHtml(id) {
  const match = source.match(new RegExp(`<section[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/section>`, "i"));
  if (!match) throw new Error(`Missing Record Book section: ${id}`);
  return match[1]
    .replace(/<(script|style|iframe|video)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(img|source)\b[^>]*\/?\s*>/gi, "")
    .replace(/\s(?:onclick|onchange|oninput|onkeyup|style)=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/<input\b[^>]*>/gi, "")
    .trim();
}

const sections = Object.fromEntries(sectionIds.map((id) => [id, sectionHtml(id)]));
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify({ source: SOURCE, syncedAt: new Date().toISOString(), sections })}\n`);
console.log(`Synced ${sectionIds.length} Record Book sections to ${OUTPUT}`);
