import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/* Review lock-v5_2-clean, Info 6: verify_locks.py crashed with
   FileNotFoundError when --report named a directory that didn't exist yet.
   It now creates it (mkdir -p). Needs python3 and the read-only design
   brain (HERO_BRAIN, default /workspace/portfolio-brain); skipped without. */
const ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(ROOT, "scripts/hero/verify_locks.py");
const BRAIN = process.env.HERO_BRAIN ?? "/workspace/portfolio-brain";
const hasPython =
  spawnSync("python3", ["--version"], { encoding: "utf8" }).status === 0;

describe.skipIf(!hasPython || !existsSync(path.join(BRAIN, "tools")))(
  "verify_locks.py --report",
  () => {
    it("creates a missing nested report directory and writes lock_check.json", () => {
      const tmp = mkdtempSync(path.join(tmpdir(), "verify-locks-"));
      const report = path.join(tmp, "not", "there", "yet");
      try {
        const r = spawnSync(
          "python3",
          [SCRIPT, "--brain", BRAIN, "--report", report],
          {
            cwd: path.dirname(SCRIPT),
            encoding: "utf8",
            env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
            timeout: 60_000,
          },
        );
        expect(r.stderr).not.toContain("FileNotFoundError");
        expect(r.status).toBe(0);
        const out = JSON.parse(
          readFileSync(path.join(report, "lock_check.json"), "utf8"),
        ) as { result: string };
        expect(out.result).toBe("PASS");
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    }, 70_000);

    it("checks locks_now30 (70 records) and every file of the T6 v3 lock (t1029s5606)", () => {
      const tmp = mkdtempSync(path.join(tmpdir(), "verify-locks-"));
      try {
        const r = spawnSync(
          "python3",
          [SCRIPT, "--brain", BRAIN, "--report", tmp],
          {
            cwd: path.dirname(SCRIPT),
            encoding: "utf8",
            env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
            timeout: 60_000,
          },
        );
        expect(r.status).toBe(0);
        const out = JSON.parse(
          readFileSync(path.join(tmp, "lock_check.json"), "utf8"),
        ) as {
          result: string;
          lists: Record<string, { entries: number; sha256: string }>;
          locks: Record<
            string,
            { sha256: string; files?: number; mismatch_count?: number }
          >;
        };
        expect(out.result).toBe("PASS");
        expect(out.lists["tools/locks_now30.sha"]).toEqual({
          entries: 70,
          sha256:
            "2c2bd246f676ce4cb88f00b75ab77500aaa8b1aaef8dc6eeb3c5f9e8fcee1070",
        });
        const t6 = Object.entries(out.locks).find(([p]) =>
          p.endsWith("/LOCK_PAINTED_CHAR_ACTION_T6_SPEAKER_GROOVE_V3.json"),
        )?.[1];
        expect(t6).toMatchObject({
          sha256:
            "129bda2dd2c58afb35151b6a04dba9ac96ed56ed6d280afc0456dbf1673fa709",
          files: 1408,
          mismatch_count: 0,
        });
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    }, 70_000);
  },
);
