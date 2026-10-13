// axe-core accessibility check per route (WCAG 2.1 A/AA), mobile and desktop.
// Fails on serious/critical violations that are NOT in a11y-baseline.json
// (known debt on the current, pre-redesign pages); lists everything else.
// Baseline entries are "<route> <rule-id>" and must shrink, never grow.
// Usage: BASE_URL=http://localhost:3000 node scripts/ci/a11y.mjs
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

import { readFileSync } from "node:fs";

import { BASE_URL, PAGE_ROUTES } from "./routes.mjs";

const baseline = new Set(
  JSON.parse(
    readFileSync(new URL("./a11y-baseline.json", import.meta.url), "utf8"),
  ).known,
);
const seenKnown = new Set();

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};
const BLOCKING = new Set(["serious", "critical"]);

const browser = await chromium.launch();
let blocking = 0;
const summary = [];
for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const route of PAGE_ROUTES) {
    await page.goto(BASE_URL + route, { waitUntil: "networkidle" });
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    for (const v of violations) {
      const key = `${route} ${v.id}`;
      const known = baseline.has(key);
      if (known) seenKnown.add(key);
      const isBlocking = BLOCKING.has(v.impact ?? "") && !known;
      if (isBlocking) blocking++;
      summary.push(
        `${isBlocking ? "FAIL" : known ? "known" : "warn"} [${vpName}] ${route} ${v.id} (${v.impact}, ${v.nodes.length} node(s)): ${v.help}`,
      );
    }
  }
  await ctx.close();
}
await browser.close();
console.log(summary.length ? summary.join("\n") : "No axe violations.");
const fixed = [...baseline].filter((k) => !seenKnown.has(k));
if (fixed.length)
  console.log(
    `\nFixed, remove from a11y-baseline.json:\n  ${fixed.join("\n  ")}`,
  );
if (blocking) {
  console.error(`\n${blocking} serious/critical accessibility violation(s).`);
  process.exit(1);
}
