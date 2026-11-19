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
  },
);
