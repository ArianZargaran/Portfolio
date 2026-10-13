// CSP check: every page must send a nonce-based CSP, every <script> must carry
// that nonce, and a real browser must report zero CSP violations.
// Usage: BASE_URL=http://localhost:3000 node scripts/ci/check-csp.mjs
import { chromium } from "playwright";

import { BASE_URL, PAGE_ROUTES } from "./routes.mjs";

const failures = [];
const fail = (route, msg) => failures.push(`${route}: ${msg}`);

for (const route of PAGE_ROUTES) {
  const res = await fetch(BASE_URL + route, { redirect: "manual" });
  const csp = res.headers.get("content-security-policy");
  if (!csp) {
    fail(route, "missing Content-Security-Policy");
    continue;
  }
  const scriptSrc =
    csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src")) ?? "";
  const nonce = /'nonce-([^']+)'/.exec(scriptSrc)?.[1];
  if (!nonce) fail(route, "script-src has no nonce");
  if (/'unsafe-inline'|'unsafe-eval'/.test(scriptSrc))
    fail(route, "script-src allows unsafe-inline/unsafe-eval");
  for (const d of [
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ]) {
    if (!csp.includes(d)) fail(route, `missing ${d}`);
  }
  if (res.headers.get("x-content-type-options") !== "nosniff")
    fail(route, "missing nosniff");
  const html = await res.text();
  for (const tag of html.match(/<script\b[^>]*>/g) ?? []) {
    if (!tag.includes(`nonce="${nonce}"`))
      fail(route, `script without nonce: ${tag.slice(0, 80)}`);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();
const violations = [];
page.on("console", (m) => {
  if (/Content Security Policy/i.test(m.text()))
    violations.push(`${page.url()}: ${m.text()}`);
});
for (const route of PAGE_ROUTES) {
  await page.goto(BASE_URL + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
}
await browser.close();
violations.forEach((v) => failures.push(`browser: ${v}`));

if (failures.length) {
  console.error(
    `CSP check failed (${failures.length}):\n` + failures.join("\n"),
  );
  process.exit(1);
}
console.log(
  `CSP check passed for ${PAGE_ROUTES.length} routes, no browser violations.`,
);
