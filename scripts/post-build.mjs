/**
 * Post-build fixups so the Next.js static export works as a Chrome Extension:
 *
 * 1. Delete __next.*.txt build-metadata files (names start with "_")
 * 2. Rename _next/ → next_assets/ and _not-found* → not-found*
 * 3. Rewrite all path references in text files
 * 4. Externalize every inline <script> block — Chrome MV3 CSP blocks them all
 */

import { readdir, rename, rm, readFile, writeFile } from "fs/promises";
import { join, extname, basename, dirname } from "path";
import { fileURLToPath } from "url";

const OUT = join(fileURLToPath(import.meta.url), "../../out");
const TEXT_EXTS = new Set([".html", ".js", ".css", ".json", ".txt", ".map"]);

// ── helpers ──────────────────────────────────────────────────────────────────

async function walk(dir, fn) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, fn);
    else await fn(full, e.name);
  }
}

async function replaceAll(filePath, pairs) {
  let text = await readFile(filePath, "utf8").catch(() => null);
  if (!text) return;
  let changed = false;
  for (const [from, to] of pairs) {
    if (text.includes(from)) { text = text.replaceAll(from, to); changed = true; }
  }
  if (changed) await writeFile(filePath, text);
}

// ── 1. Remove Next.js build-metadata files (names begin with "__next.") ─────
for (const e of await readdir(OUT, { withFileTypes: true })) {
  if (e.name.startsWith("__next.")) {
    await rm(join(OUT, e.name), { force: true });
    console.log(`🗑  Removed  ${e.name}`);
  }
}

// ── 2. Rename _next → next_assets, _not-found* → not-found* ─────────────────
await rename(join(OUT, "_next"), join(OUT, "next_assets"));
console.log("✏️  _next → next_assets");

for (const e of await readdir(OUT, { withFileTypes: true })) {
  if (e.name.startsWith("_not-found")) {
    const next = e.name.replace(/^_/, "");
    await rename(join(OUT, e.name), join(OUT, next));
    console.log(`✏️  ${e.name} → ${next}`);
  }
}

// ── 3. Rewrite path references in every text file ────────────────────────────
const pathFixes = [
  ["/_next/",      "/next_assets/"],
  ['"/_next',      '"/next_assets'],
  ["'/_next",      "'/next_assets"],
  ["/_not-found",  "/not-found"],
  ['"/_not-found', '"/not-found'],
];

await walk(OUT, async (file) => {
  if (TEXT_EXTS.has(extname(file))) await replaceAll(file, pathFixes);
});
console.log("✏️  Path references updated");

// ── 4. Externalize inline <script> blocks in every HTML file ─────────────────
//
// Chrome MV3 CSP: script-src 'self'  — inline scripts are completely blocked.
// Next.js App Router writes several inline <script> tags for RSC streaming.
// We extract them in order into one external file per HTML page.

const INLINE_RE = /<script(\s[^>]*)?>([^<]+)<\/script>/g;

async function externalizeInlineScripts(htmlPath) {
  let html = await readFile(htmlPath, "utf8");
  const chunks = [];

  html = html.replace(INLINE_RE, (match, attrs = "", body) => {
    if (/\bsrc\s*=/.test(attrs)) return match;   // has src — leave it alone
    const trimmed = body.trim();
    if (!trimmed) return match;                   // empty — leave it alone
    chunks.push(trimmed);
    return "";                                    // strip inline script
  });

  if (chunks.length === 0) return;

  // Write all chunks, in order, to a single external file
  const slug = basename(htmlPath, ".html") || "index";
  const scriptName = `pm-data-${slug}.js`;
  await writeFile(join(OUT, scriptName), chunks.join("\n"));

  // Inject one <script src="…"> just before </body>
  html = html.replace("</body>", `<script src="/${scriptName}"></script>\n</body>`);
  await writeFile(htmlPath, html);
  console.log(`✏️  ${basename(htmlPath)} → ${chunks.length} inline scripts → /${scriptName}`);
}

for (const e of await readdir(OUT, { withFileTypes: true })) {
  if (!e.isDirectory() && e.name.endsWith(".html")) {
    await externalizeInlineScripts(join(OUT, e.name));
  }
}

console.log("\n✅  Done — load ./out as an unpacked Chrome extension");
