import { readFileSync } from "node:fs";
import path from "node:path";

import { isPrimed, WARM_MAX_ACTIONS, type PrimeProbe } from "./warm";

/* The Safari probe (plain JS) carries a copy of the player's isPrimed rule
   for its S1a cut-in row (review N2), and picks the clips its warm check
   holds. This keeps them in sync with warm.ts. */
const html = readFileSync(
  path.resolve(__dirname, "../../../scripts/hero/safari-probe/probe.html"),
  "utf8",
);
const src = /\/\/ BEGIN s1aProbe[^\n]*\n([\s\S]*?)\/\/ END s1aProbe/.exec(
  html,
)?.[1];
// eslint-disable-next-line @typescript-eslint/no-implied-eval -- test-only: evaluates the probe's own snippet
const probe = new Function(
  `${src ?? ""}; return { isPrimed, warmClips, s1aCutInVerdict };`,
)() as {
  isPrimed: typeof isPrimed;
  warmClips: (clips: string[]) => string[];
  s1aCutInVerdict: (
    rows: {
      clip: string;
      primed: boolean;
      primedPlayMs?: number;
      coldMs?: number;
    }[],
  ) => string;
};

const SHIPPED = [
  "nod.k180",
  ...[0, 36, 72, 108, 144, 180].map((k) => `s1a.k${k}`),
  "typing",
];

describe("Safari probe S1a cut-in row (review N2)", () => {
  it("has the snippet", () => expect(src).toContain("function isPrimed"));

  it("isPrimed matches warm.ts", () => {
    const cases: PrimeProbe[] = [];
    for (const readyState of [0, 1, 2, 4])
      for (const seeking of [false, true])
        for (const paused of [false, true])
          for (const currentTime of [0, 0.04, 0.0417, 0.083, 0.09, 0.125])
            cases.push({ readyState, seeking, paused, currentTime });
    for (const c of cases)
      for (const f of [0, 1])
        expect({ c, f, v: probe.isPrimed(c, f, 12) }).toEqual({
          c,
          f,
          v: isPrimed(c, f, 12),
        });
  });

  it("the warm check holds what the pool can (base + 2), not every clip", () => {
    const w = probe.warmClips(SHIPPED);
    expect(w).toEqual(["typing", "nod.k180", "s1a.k0"]);
    expect(w.length).toBe(1 + WARM_MAX_ACTIONS);
    expect(probe.warmClips(["typing"])).toEqual(["typing"]);
  });

  it("verdict: ok only when every S1a clip is primed; flags a slow cold path", () => {
    const row = (clip: string, coldMs = 40, primed = true) => ({
      clip,
      primed,
      primedPlayMs: 30,
      coldMs,
    });
    expect(probe.s1aCutInVerdict([])).toMatch(/^n\/a/);
    expect(probe.s1aCutInVerdict([row("s1a.k0"), row("s1a.k36")])).toMatch(
      /^ok: .*cold path also fits one frame \(max 40\.0 ms\)/,
    );
    expect(probe.s1aCutInVerdict([row("s1a.k0", 120)])).toMatch(
      /^ok: .*priming is load-bearing/,
    );
    expect(
      probe.s1aCutInVerdict([row("s1a.k0"), row("s1a.k36", 40, false)]),
    ).toMatch(/^PROBLEM: .*s1a\.k36/);
  });

  it("verdict flags a primed play() slower than ~125 ms (the player's 1.5-frame drift limit, review R2)", () => {
    const row = (clip: string, primedPlayMs: number) => ({
      clip,
      primed: true,
      primedPlayMs,
      coldMs: 40,
    });
    expect(probe.s1aCutInVerdict([row("s1a.k0", 125)])).toMatch(
      /^ok: primed on every S1a clip \(cut-in 0 ms, play\(\) max 125\.0 ms <= 125 ms\)/,
    );
    expect(
      probe.s1aCutInVerdict([row("s1a.k0", 60), row("s1a.k72", 125.1)]),
    ).toMatch(
      /^PROBLEM: primed play\(\) slower than 125 ms \(s1a\.k72 125\.1 ms\)/,
    );
    // Not primed is still reported first.
    expect(
      probe.s1aCutInVerdict([{ ...row("s1a.k0", 300), primed: false }]),
    ).toMatch(/^PROBLEM: not decoded/);
  });

  it("the threshold equals the player's drift limit (1.5 frames at 12 fps)", () => {
    const player = readFileSync(
      path.resolve(__dirname, "../../components/scene/hero-player.tsx"),
      "utf8",
    );
    const drift = Number(
      /const MAX_DRIFT_FRAMES = ([\d.]+);/.exec(player)?.[1],
    );
    const max = Number(
      /const PRIMED_PLAY_MAX_MS = (\d+);/.exec(src ?? "")?.[1],
    );
    expect(max).toBe(Math.round((drift * 1000) / 12));
  });
});
