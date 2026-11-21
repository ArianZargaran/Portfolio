// Bundle size budgets (gzip) for the client build. Run after `npm run build`.
// Budgets live in bundle-budgets.json at the repo root.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const budgets = JSON.parse(readFileSync("bundle-budgets.json", "utf8"));
delete budgets.$comment;
// Lazy hero player chunk (M8): its own budget, since it's fetched on the
// home page right after load.
const HERO_CHUNK = /^hero-player-[\w-]+\.js$/;
// Lazy reactions chunk (change 1, code split): the clip registry, reaction
// queue, E2 egg, event wiring and warm pool. The loop player import()s it
// after the loop's first frame, so it is NOT on the critical path; it has
// its own cap and is reported beside the critical-path total.
const REACTIONS_CHUNK = /^hero-reactions-[\w-]+\.js$/;
// Always-loaded scene route chunk (review N4): the shell, hit areas,
// freeze, net gate and actions registry ship with the home page itself.
const SCENE_CHUNK = /^scene-[\w-]+\.js$/;
const dir = "build/client/assets";
const files = readdirSync(dir)
  .filter((f) => !f.endsWith(".map"))
  .map((f) => {
    const buf = readFileSync(path.join(dir, f));
    return {
      f,
      raw: buf.length,
      gz: gzipSync(buf, { level: 9 }).length,
      br: brotliCompressSync(buf, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
      }).length,
    };
  });
const kb = (b) => (b / 1024).toFixed(1) + " kB";
const js = files.filter((x) => x.f.endsWith(".js"));
const css = files.filter((x) => x.f.endsWith(".css"));
const sum = (xs) => xs.reduce((a, x) => a + x.gz, 0);

// Initial JS = the client entry + root route + everything they statically
// import. Works after a plain `npm run build`: the React Router manifest
// (build/client/assets/manifest-*.js, always emitted) lists the flattened
// static imports. If a Vite manifest exists (BUNDLE_REPORT=1 build), it is
// used instead and walked recursively; both give the same set.
function initialFromViteManifest() {
  const manifestPath = "build/client/.vite/manifest.json";
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
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
  return [...seen].map((k) => path.basename(manifest[k].file));
}
function initialFromRouterManifest() {
  const f = readdirSync(dir).find((x) => /^manifest-[\w-]+\.js$/.test(x));
  if (!f) return null;
  const src = readFileSync(path.join(dir, f), "utf8");
  const json = src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1);
  const rr = JSON.parse(json);
  const root = rr.routes.root;
  return [rr.entry.module, ...rr.entry.imports, root.module, ...root.imports]
    .filter(Boolean)
    .map((u) => path.basename(u));
}
const initialFiles = [
  ...new Set(initialFromViteManifest() ?? initialFromRouterManifest() ?? []),
];
if (!initialFiles.length) {
  console.error("No build manifest found. Run `npm run build` first.");
  process.exit(1);
}
const initialJs = sum(js.filter((x) => initialFiles.includes(x.f)));

const hero = js.filter((x) => HERO_CHUNK.test(x.f));
if (!hero.length) {
  console.error(
    "No hero-player chunk in the build (renamed? update HERO_CHUNK).",
  );
  process.exit(1);
}
const scene = js.filter((x) => SCENE_CHUNK.test(x.f));
if (!scene.length) {
  console.error("No scene chunk in the build (renamed? update SCENE_CHUNK).");
  process.exit(1);
}
const reactions = js.filter((x) => REACTIONS_CHUNK.test(x.f));
if (!reactions.length) {
  console.error(
    "No hero-reactions chunk in the build (renamed? update REACTIONS_CHUNK).",
  );
  process.exit(1);
}

// Hero critical path = the scene chunk + the loop player chunk + every
// chunk either of them imports STATICALLY that isn't already initial JS
// (so code can't hide from the cap in a shared chunk). Dynamic import()s
// (the reactions chunk) are not followed.
const staticImports = (f) => {
  const src = readFileSync(path.join(dir, f), "utf8");
  const out = new Set();
  for (const m of src.matchAll(
    /(?:^|[;}\s])(?:import|export)\s*(?:[\w*{}\s,$]*from\s*)?["']\.\/([\w.-]+\.js)["']/g,
  ))
    out.add(m[1]);
  return [...out];
};
const critical = new Set([...scene, ...hero].map((x) => x.f));
for (const f of [...critical])
  for (const dep of staticImports(f))
    if (!initialFiles.includes(dep)) critical.add(dep);
const criticalJs = js.filter((x) => critical.has(x.f));
const leaked = [...critical].filter((f) => REACTIONS_CHUNK.test(f));
if (leaked.length) {
  console.error(
    `The reactions chunk is statically imported by the critical path: ${leaked.join(", ")}`,
  );
  process.exit(1);
}

const checks = [
  ["initial JS (entry + static imports)", initialJs, budgets.initialJsKb],
  ["total JS", sum(js), budgets.totalJsKb],
  ["total CSS", sum(css), budgets.totalCssKb],
  ["largest JS chunk", Math.max(...js.map((x) => x.gz)), budgets.maxChunkKb],
  ["hero player chunk (lazy loop player)", sum(hero), budgets.heroChunkKb],
  ["scene chunk (always loaded)", sum(scene), budgets.sceneChunkKb],
  [
    "hero JS critical path (scene + loop player + their static imports)",
    sum(criticalJs),
    budgets.heroTotalKb,
  ],
  [
    "hero reactions chunk (lazy, after the loop's first frame)",
    sum(reactions),
    budgets.heroReactionsChunkKb,
  ],
];
let failed = false;
for (const [name, size, limitKb] of checks) {
  const ok = size <= limitKb * 1024;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${kb(size)} / ${limitKb} kB`);
}
const row = (label, xs) =>
  console.log(
    `  ${label.padEnd(44)} raw ${String(xs.reduce((a, x) => a + x.raw, 0)).padStart(6)}  gzip ${String(sum(xs)).padStart(6)}  brotli ${String(xs.reduce((a, x) => a + x.br, 0)).padStart(6)} B`,
  );
console.log(
  "\nHero chunks (bytes; gzip -9 is the budget metric, brotli q11 for info):",
);
for (const x of criticalJs) row(`${x.f} (critical)`, [x]);
for (const x of reactions) row(`${x.f} (lazy)`, [x]);
row("critical path total", criticalJs);
row("all hero JS (critical + reactions)", [...criticalJs, ...reactions]);
console.log(
  `  critical-path headroom: ${budgets.heroTotalKb * 1024 - sum(criticalJs)} B gzip of ${budgets.heroTotalKb * 1024}`,
);
console.log("\nLargest chunks:");
js.sort((a, b) => b.gz - a.gz)
  .slice(0, 5)
  .forEach((x) => console.log(`  ${kb(x.gz).padStart(9)}  ${x.f}`));
process.exit(failed ? 1 : 0);
