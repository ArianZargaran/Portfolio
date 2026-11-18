// Hero media byte budgets (M8). Run any time (no build needed):
//   node scripts/ci/check-media.mjs [--budgets media-budgets.json] [--dir <clips>] [--manifest <json>|--no-manifest]
// Checks every <name>.<av1|h264>.mp4 in the clip folder against its cap
// (base loop, reaction, or an explicit exception), that the files match the
// sizes recorded in hero-media.build.json (which the player's budget table
// is tested against), and that the worst-case visit fits the per-visit
// budget: every clip of a single-variant action, and the largest variant of
// a multi-variant one (`<action>.k<join>.<codec>.mp4`; intent fetch loads
// one variant per visit). Exits 1 on any failure.
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
// Variant names: <action>.k<join>[.<sha8>] (variants.py adds the content hash).
const groupOf = (name) => name.replace(/[._-]k\d+(\.[0-9a-f]{8})?$/, "");
for (const f of files.sort()) {
  const [, name, codec] = f.match(/^(.+)\.(av1|h264)\.mp4$/);
  const bytes = statSync(path.join(dir, f)).size;
  const g = groupOf(name);
  worst[codec].set(g, Math.max(worst[codec].get(g) ?? 0, bytes));
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
console.log(rows.join("\n"));
process.exit(failed ? 1 : 0);
