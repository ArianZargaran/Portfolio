// Hero media byte budgets (M8). Run any time (no build needed):
//   node scripts/ci/check-media.mjs [--budgets media-budgets.json] [--dir <clips>] [--manifest <json>|--no-manifest]
// Checks every <name>.<av1|h264>.mp4 in the clip folder against its cap
// (base loop, reaction, or an explicit exception), that the files match the
// sizes recorded in hero-media.build.json (which the player's budget table
// is tested against), and that the worst-case visit fits the per-visit
// budget: every clip of a single-variant action, and the largest variant of
// a multi-variant one (`<action>.k<join>.<codec>.mp4`; intent fetch loads
// one variant per visit). It also models repeated glances in one visit
// (review N1): the player's runtime budget fetches a variant only while
// every single-clip action (the E2 egg nod) still fits beside it
// (budget.canFetchKeeping), so the runtime total, under any number of
// glances in the worst (largest-first) order, with the egg before or after
// them, must never exceed the per-visit cap. Exits 1 on any failure.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const budgets = JSON.parse(
  readFileSync(arg("--budgets") ?? "media-budgets.json", "utf8"),
);
const dir = arg("--dir") ?? budgets.dir;
const manifestPath = args.includes("--no-manifest")
  ? null
  : (arg("--manifest") ?? budgets.manifest);
const manifest =
  manifestPath && existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8")).clips
    : null;

const kB = (b) => (b / 1000).toFixed(1) + " kB";
const rows = [];
let failed = false;
const report = (ok, msg) => {
  if (!ok) failed = true;
  rows.push(`${ok ? "ok  " : "FAIL"} ${msg}`);
};

const files = readdirSync(dir).filter((f) => /\.(av1|h264)\.mp4$/.test(f));
if (!files.length) {
  console.error(`No clips found in ${dir}`);
  process.exit(1);
}
// Worst case per codec: the largest file of each action group.
const worst = { av1: new Map(), h264: new Map() };
// Every clip per codec and group (for the multi-glance model).
const clips = { av1: new Map(), h264: new Map() };
// Variant names: <action>.k<join>[.<sha8>] (variants.py adds the content hash).
const groupOf = (name) => name.replace(/[._-]k\d+(\.[0-9a-f]{8})?$/, "");
for (const f of files.sort()) {
  const [, name, codec] = f.match(/^(.+)\.(av1|h264)\.mp4$/);
  const bytes = statSync(path.join(dir, f)).size;
  const g = groupOf(name);
  worst[codec].set(g, Math.max(worst[codec].get(g) ?? 0, bytes));
  clips[codec].set(g, [...(clips[codec].get(g) ?? []), { name, bytes }]);
  const exc = budgets.exceptions?.[name];
  const role = budgets.roles?.[name] ?? "reaction";
  const cap = exc?.[codec] ?? budgets.caps[role][codec];
  const why = exc ? `exception: ${exc.reason}` : role;
  report(bytes <= cap, `${f}: ${kB(bytes)} / ${kB(cap)} (${why})`);
  if (manifest) {
    const m = manifest[f]?.bytes;
    report(
      m === bytes,
      `${f}: matches hero-media.build.json (${m ?? "missing"} B)`,
    );
  }
}
for (const codec of ["av1", "h264"]) {
  const cap = budgets.visitBudget[codec];
  const total = [...worst[codec].values()].reduce((a, b) => a + b, 0);
  report(
    total <= cap,
    `worst-case ${codec} visit (base + one variant per action): ${kB(total)} / ${kB(cap)}`,
  );
}
// Multi-glance runtime model (mirrors app/scene/hero/budget.ts and the
// player's fetchReactionClip). Base and single-clip groups (the egg nod)
// are the reserve; multi-variant groups (S1a) are the glances.
const GLANCE_ROUNDS = 4; // every variant asked for 4 times over: >> any visit
for (const codec of ["av1", "h264"]) {
  const cap = budgets.visitBudget[codec];
  const groups = [...clips[codec].entries()];
  const isBase = ([, c]) => c.some((x) => budgets.roles?.[x.name] === "base");
  const base = groups.filter(isBase);
  const single = groups.filter((g) => g[1].length === 1 && !isBase(g));
  const multi = groups.filter(([, c]) => c.length > 1);
  if (!multi.length) continue;
  const reserve = single.map(([, c]) => c[0]);
  const glances = multi.flatMap(([, c]) => c).sort((a, b) => b.bytes - a.bytes);
  for (const eggFirst of [false, true]) {
    const fetched = new Set();
    let spent = 0;
    let peak = 0;
    const charge = (c) => {
      if (fetched.has(c.name)) return;
      fetched.add(c.name);
      spent += c.bytes;
      peak = Math.max(peak, spent);
    };
    const cost = (c) => (fetched.has(c.name) ? 0 : c.bytes);
    base.forEach(([, c]) => c.forEach(charge));
    const egg = () =>
      reserve.forEach((r) => spent + cost(r) <= cap && charge(r));
    if (eggFirst) egg();
    let n = 0;
    for (let round = 0; round < GLANCE_ROUNDS; round++)
      for (const c of glances) {
        const keep = reserve.reduce((a, r) => a + cost(r), 0);
        if (spent + cost(c) + keep <= cap) {
          if (!fetched.has(c.name)) n++;
          charge(c);
        }
      }
    const eggFits = reserve.every((r) => spent + cost(r) <= cap);
    if (!eggFirst) egg();
    const when = eggFirst ? "egg first" : "egg after";
    report(
      peak <= cap && eggFits && reserve.every((r) => fetched.has(r.name)),
      `multi-glance ${codec} visit (${GLANCE_ROUNDS}x every variant, largest first, ${when}): ` +
        `${n} variant(s) + ${reserve.map((r) => r.name).join(", ")} fetched, runtime peak ${kB(peak)} / ${kB(cap)}`,
    );
    report(n >= 1, `multi-glance ${codec} (${when}): at least one glance fits`);
  }
  // Without the egg reserve one more glance would fit and starve the egg,
  // and fetching every variant would not fit at all: the gate is load-bearing.
  const all = base.flatMap(([, c]) => c).concat(glances, reserve);
  const everything = all.reduce((a, c) => a + c.bytes, 0);
  rows.push(
    `info every clip in one visit (no runtime gate) ${codec}: ${kB(everything)} / ${kB(cap)}${everything > cap ? " (over: the runtime gate is what keeps a visit inside the cap)" : ""}`,
  );
}
console.log(rows.join("\n"));
process.exit(failed ? 1 : 0);
