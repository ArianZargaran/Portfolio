import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/* Review finding 3: scripts/hero/build_web_media.py builds the retired v5_1
   clips. It must refuse to touch the v5_2 install (media/ + the build
   manifest) unless --force-v5_1-over-v5_2 is passed. */
const ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(ROOT, "scripts/hero/build_web_media.py");
const MEDIA = path.join(__dirname, "media");
const MANIFEST = path.join(ROOT, "scripts/hero/hero-media.build.json");
const hasPython =
  spawnSync("python3", ["--version"], { encoding: "utf8" }).status === 0;

const snapshot = () =>
  [MANIFEST, ...readdirSync(MEDIA).map((f) => path.join(MEDIA, f))]
    .map(
      (f) =>
        `${path.basename(f)}:${createHash("sha256").update(readFileSync(f)).digest("hex")}`,
    )
    .sort();

describe.skipIf(!hasPython)("build_web_media.py v5_1 guard", () => {
  it("refuses with a clear message and writes nothing", () => {
    const before = snapshot();
    const r = spawnSync("python3", [SCRIPT], {
      cwd: path.dirname(SCRIPT),
      encoding: "utf8",
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      timeout: 20_000,
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("REFUSING to run");
    expect(r.stderr).toContain("HERO_JOIN_VERSION = v5_2");
    expect(r.stderr).toContain("--force-v5_1-over-v5_2");
    expect(r.stdout).not.toMatch(/built|skip/);
    expect(snapshot()).toEqual(before);
  });
});
