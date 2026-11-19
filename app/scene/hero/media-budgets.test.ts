// @vitest-environment node
/* M8: the media byte check (scripts/ci/check-media.mjs) passes on the
   shipped clips and fails on an oversize fixture. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

  it("has no exceptions (the nod fits the reaction cap since the v5_2 install)", () => {
    const b = JSON.parse(readFileSync("media-budgets.json", "utf8")) as {
      exceptions: Record<string, unknown>;
    };
    expect(b.exceptions).toEqual({});
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
      clip("fx.k72.av1.mp4", 120_001);
      const r = run("--dir", dir, "--no-manifest");
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(
        /FAIL fx\.k72\.av1\.mp4: 120\.0 kB \/ 120\.0 kB/,
      );
    });

    it("fails on a reaction clip over 160 kB (H.264), the nod included", () => {
      clip("nod.k180.h264.mp4", 160_001);
      const r = run("--dir", dir, "--no-manifest");
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(
        /FAIL nod\.k180\.h264\.mp4: 160\.0 kB \/ 160\.0 kB \(reaction\)/,
      );
    });

    it("fails when an explicit exception grows past its own cap", () => {
      const budgets = JSON.parse(readFileSync("media-budgets.json", "utf8"));
      budgets.exceptions = {
        nod: { av1: 165_000, h264: 218_000, reason: "fixture" },
      };
      const file = path.join(dir, "budgets.json");
      writeFileSync(file, JSON.stringify(budgets));
      clip("nod.h264.mp4", 218_001);
      const r = run("--budgets", file, "--dir", dir, "--no-manifest");
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(/FAIL nod\.h264\.mp4: .*exception: fixture/);
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
