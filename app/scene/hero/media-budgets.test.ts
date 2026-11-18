// @vitest-environment node
/* M8: the media byte check (scripts/ci/check-media.mjs) passes on the
   shipped clips and fails on an oversize fixture. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const run = (...args: string[]) =>
  spawnSync(process.execPath, ["scripts/ci/check-media.mjs", ...args], {
    encoding: "utf8",
  });

describe("check-media (M8)", () => {
  it("passes on the shipped clips", () => {
    const r = run();
    expect(r.stdout).not.toMatch(/FAIL/);
    expect(r.status).toBe(0);
  });

  describe("fixtures", () => {
    let dir: string;
    beforeEach(() => {
      dir = mkdtempSync(path.join(tmpdir(), "hero-media-"));
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));
    const clip = (name: string, bytes: number) =>
      writeFileSync(path.join(dir, name), Buffer.alloc(bytes));

    it("fails on a reaction clip over 120 kB (AV1)", () => {
      clip("typing.av1.mp4", 300_000);
      clip("bounce.av1.mp4", 120_001);
      const r = run("--dir", dir, "--no-manifest");
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(/FAIL bounce\.av1\.mp4: 120\.0 kB \/ 120\.0 kB/);
    });

    it("fails when an exception grows past its own cap", () => {
      clip("nod.h264.mp4", 218_001);
      expect(run("--dir", dir, "--no-manifest").status).toBe(1);
    });

    it("counts one variant per action toward the worst-case visit", () => {
      clip("typing.av1.mp4", 330_000);
      for (const k of [0, 36, 72, 108, 144, 180])
        clip(`speaker.k${k}.${String(k).padStart(8, "0")}.av1.mp4`, 110_000);
      const r = run("--dir", dir, "--no-manifest");
      expect(r.stdout).toMatch(/worst-case av1 visit .*: 440\.0 kB/);
      expect(r.status).toBe(0);
    });
  });
});
