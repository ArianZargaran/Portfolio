// Bundle size budgets (gzip) for the client build. Run after `npm run build`.
// Budgets live in bundle-budgets.json at the repo root.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const budgets = JSON.parse(readFileSync("bundle-budgets.json", "utf8"));
delete budgets.$comment;
const dir = "build/client/assets";
const files = readdirSync(dir)
  .filter((f) => !f.endsWith(".map"))
  .map((f) => {
    const buf = readFileSync(path.join(dir, f));
    return { f, gz: gzipSync(buf, { level: 9 }).length };
  });
const kb = (b) => (b / 1024).toFixed(1) + " kB";
const js = files.filter((x) => x.f.endsWith(".js"));
const css = files.filter((x) => x.f.endsWith(".css"));
const sum = (xs) => xs.reduce((a, x) => a + x.gz, 0);

// Initial JS = the client entry + everything it statically imports (from the Vite manifest).
const manifestPath = "build/client/.vite/manifest.json";
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  console.error("No Vite manifest. Build with BUNDLE_REPORT=1 npm run build.");
  process.exit(1);
}
const entryKeys = Object.keys(manifest).filter(
  (k) => k === "app/entry.client.tsx" || k.startsWith("app/root.tsx"),
);
const seen = new Set();
const walk = (k) => {
  if (!k || seen.has(k)) return;
  seen.add(k);
  (manifest[k].imports ?? []).forEach(walk);
};
entryKeys.forEach(walk);
const initialFiles = [...seen].map((k) => path.basename(manifest[k].file));
const initialJs = sum(js.filter((x) => initialFiles.includes(x.f)));

const checks = [
  ["initial JS (entry + static imports)", initialJs, budgets.initialJsKb],
  ["total JS", sum(js), budgets.totalJsKb],
  ["total CSS", sum(css), budgets.totalCssKb],
  ["largest JS chunk", Math.max(...js.map((x) => x.gz)), budgets.maxChunkKb],
];
let failed = false;
for (const [name, size, limitKb] of checks) {
  const ok = size <= limitKb * 1024;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${kb(size)} / ${limitKb} kB`);
}
console.log("\nLargest chunks:");
js.sort((a, b) => b.gz - a.gz)
  .slice(0, 5)
  .forEach((x) => console.log(`  ${kb(x.gz).padStart(9)}  ${x.f}`));
process.exit(failed ? 1 : 0);
