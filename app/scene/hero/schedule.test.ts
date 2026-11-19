import { fixtureVariant, withFixtures } from "./__fixtures__/actions";
import {
  ACTIONS,
  BASE_LOOP,
  cutWindows,
  validateAction,
  type ActionDef,
} from "./actions";
import { CLOUD_PERIOD_S, createClock, mod, phase } from "./clock";
import {
  HERO_ROTATION,
  absFrameAt,
  actionFrameToBase,
  decide,
  driftFrames,
  frameTime,
  nextOccurrence,
  stateAt,
  validateRotation,
  type Rotation,
} from "./schedule";

const FPS = BASE_LOOP.fps;
const N = BASE_LOOP.frames;
const LOOP_S = N / FPS; // 18 s
const tOf = (abs: number) => (abs + 0.5) / FPS;
const nod = ACTIONS["nod.k180"];
/* A per-entry clip baked for the f72 join (the shape S1b ships in once it
   locks), and a rotation that plays it in cycle 2 like the held draft. */
const fx72 = fixtureVariant(72);
const fx36 = fixtureVariant(36);
const FX = withFixtures(fx72, fx36);
const FX_ROT = [null, "nod.k180", fx72.id, null] as Rotation;
const stateFx = (t: number) => stateAt(t, FX_ROT, BASE_LOOP, FX);

describe("shared clock", () => {
  it("phase = (t mod period) / period, also for negative t", () => {
    expect(phase(0, 24)).toBe(0);
    expect(phase(30, 24)).toBeCloseTo(0.25);
    expect(phase(-6, 24)).toBeCloseTo(0.75);
    expect(phase(80, CLOUD_PERIOD_S)).toBeCloseTo(8 / 72);
    expect(mod(-1, 216)).toBe(215);
  });

  it("stops while paused and resumes without a jump", () => {
    let ms = 1000;
    const c = createClock(() => ms);
    ms += 2000;
    expect(c.now()).toBeCloseTo(2);
    c.pause();
    ms += 5000;
    expect(c.paused).toBe(true);
    expect(c.now()).toBeCloseTo(2);
    c.resume();
    ms += 1000;
    expect(c.now()).toBeCloseTo(3);
  });

  it("4 base cycles = 72 s = one cloud period, so the scene realigns", () => {
    expect(LOOP_S).toBe(18);
    expect(HERO_ROTATION.length * LOOP_S).toBe(CLOUD_PERIOD_S);
  });
});

describe("registry", () => {
  it.each(Object.values(ACTIONS))("$id passes the static checks", (a) => {
    expect(validateAction(a)).toEqual([]);
  });

  it("E2 nod: frame i maps to loop frame (120 + i) mod 216", () => {
    expect(actionFrameToBase(nod, 0)).toBe(120);
    expect(actionFrameToBase(nod, 95)).toBe(215);
    expect(actionFrameToBase(nod, 96)).toBe(0);
    expect(actionFrameToBase(nod, 167)).toBe(71);
    for (let i = 0; i < nod.frames; i++)
      expect(actionFrameToBase(nod, i)).toBe((120 + i) % 216);
  });

  it("the encoded clips cover a cut-in and a cut-out window", () => {
    // Nod v4 home-pose sub-clip i60-131: cut in at f180 (i60), out by f35.
    expect(cutWindows(nod)).toEqual({ enter: [60, 61], exit: [109, 131] });
    // Per-entry variants: only frame 0 equals the loop (measured), so the
    // clip must be up exactly on its join; the tail matches the loop.
    expect(cutWindows(fx72)).toEqual({ enter: [0, 0], exit: [32, 35] });
  });

  it("design A: one baked clip per entry, each spliced on its own join", () => {
    // Locked install (t1003s5480, option (a)): only the nod v4 clip ships.
    expect(Object.keys(ACTIONS)).toEqual(["nod.k180"]);
    for (const a of [...Object.values(ACTIONS), fx72, fx36]) {
      expect(a.id).toBe(`${a.family}.k${a.entry}`);
      // The clip's first frame sits on its entry join.
      expect(actionFrameToBase(a, a.clip.firstFrame)).toBe(a.entry);
    }
  });

  it("flags a clip whose first frame is not on its entry join", () => {
    expect(validateAction({ ...nod, entry: 144 })).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/does not start on its entry join f144/),
      ]),
    );
    // An enter window wide enough to reach a foreign join is rejected too:
    // the cut could then land on f72 with a clip baked for f36.
    const wide: ActionDef = {
      ...fx36,
      frames: 80,
      enterWindow: [0, 40],
      exitWindow: [70, 79],
      clip: { ...fx36.clip, firstFrame: 0, frames: 80 },
    };
    expect(validateAction(wide)).toEqual([
      "fx.k36: enter window reaches the foreign join f72",
    ]);
  });

  it("flags a broken entry", () => {
    const bad: ActionDef = {
      ...nod,
      fps: 24,
      enterWindow: [0, 120],
      clip: { ...nod.clip, firstFrame: 130, frames: 60 },
    };
    expect(validateAction(bad)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/fps/),
        expect.stringMatching(/enter window$/),
        expect.stringMatching(/overlaps exit/),
        expect.stringMatching(/clip longer/),
      ]),
    );
  });
});

describe("schedule", () => {
  it("default rotation has no overlapping clips", () => {
    expect(validateRotation(HERO_ROTATION)).toEqual([]);
  });

  it("detects overlapping clips", () => {
    // An untrimmed nod (cycle 1, runs to cycle 2 f71) collides with a
    // strong bounce baked for cycle 2's f36 join.
    const full = (a: ActionDef): ActionDef => ({
      ...a,
      clip: { ...a.clip, firstFrame: 0, frames: a.frames },
    });
    const errs = validateRotation(
      [null, "nod.k180", fx36.id] as Rotation,
      BASE_LOOP,
      { ...FX, "nod.k180": full(nod) },
    );
    expect(errs).toEqual([
      "nod.k180@1 overlaps fx.k36@2",
      "nod.k180@4 overlaps fx.k36@5",
    ]);
    expect(validateRotation(FX_ROT, BASE_LOOP, FX)).toEqual([]);
  });

  it("absolute frame is floor(t * fps) and base frame wraps every 18 s", () => {
    expect(absFrameAt(0, FPS)).toBe(0);
    expect(absFrameAt(1 / 12, FPS)).toBe(1); // no float slip below the boundary
    expect(stateAt(LOOP_S).baseFrame).toBe(0);
    expect(stateAt(LOOP_S - 0.001).baseFrame).toBe(215);
  });

  it("cycle 0 is typing only", () => {
    for (let abs = 0; abs < N; abs++)
      expect(stateAt(tOf(abs)).action).toBeUndefined();
  });

  it("the nod starts at base frame 120 of cycle 1 and its frames line up with the loop", () => {
    const start = N + 120; // t = 28 s
    expect(stateAt(tOf(start - 1)).action).toBeUndefined();
    for (let i = 0; i < nod.frames; i++)
      expect(stateAt(tOf(start + i)).baseFrame).toBe(actionFrameToBase(nod, i)); // the splice invariant
    // Until its clip ends the nod owns the frame; past it the tail is
    // base-identical and the next lead-in may own it.
    for (let i = 0; i < 132; i++) {
      const s = stateAt(tOf(start + i));
      expect(s.action?.occurrence.action.id).toBe("nod.k180");
      expect(s.action?.frame).toBe(i);
      expect(s.action?.clipFrame).toBe(i >= 60 ? i - 60 : -1);
    }
    // The clip cuts in on the f180 join and is back by the f36 join.
    expect(stateAt(tOf(start + 60)).baseFrame).toBe(180);
    expect(stateAt(tOf(start + 132)).baseFrame).toBe(36);
    // Default rotation: nothing after the nod until S1b locks.
    expect(stateAt(tOf(start + nod.frames)).action).toBeUndefined();
    expect(stateFx(tOf(start + nod.frames)).action?.occurrence.action.id).toBe(
      "fx.k72",
    );
    expect(decide(stateAt(tOf(start + 140)), "base", true)).toEqual({
      show: "base",
    });
  });

  it("phases: enter until i61, core i62-108, exit from i109", () => {
    const at = (i: number) => stateAt(tOf(N + 120 + i)).action?.phase;
    expect(at(61)).toBe("enter");
    expect(at(62)).toBe("core");
    expect(at(108)).toBe("core");
    expect(at(109)).toBe("exit");
  });

  it("default rotation: cycle 2 is typing once the nod is back (no bounce until S1b locks)", () => {
    expect(HERO_ROTATION).toEqual([null, "nod.k180", null, null]);
    for (let abs = 2 * N + 132; abs < 4 * N; abs++)
      expect(stateAt(tOf(abs)).action).toBeUndefined();
  });

  it("a per-entry clip in cycle 2 starts on its own f72 join, after the nod is back", () => {
    const s = stateFx(tOf(2 * N + 0));
    expect(s.action?.occurrence.action.id).toBe("nod.k180");
    expect(s.action?.phase).toBe("core");
    const b = stateFx(tOf(2 * N + 90));
    expect(b.action?.occurrence.action.id).toBe("fx.k72");
    expect(b.action?.frame).toBe(18);
    expect(b.action?.clipFrame).toBe(18);
  });

  it("repeats every 72 s", () => {
    for (const abs of [0, 300, 400, 520, 700, 863])
      expect(stateAt(tOf(abs + 4 * N))).toEqual({
        ...stateAt(tOf(abs)),
        abs: abs + 4 * N,
        cycle: stateAt(tOf(abs)).cycle + 4,
        ...(stateAt(tOf(abs)).action
          ? {
              action: {
                ...stateAt(tOf(abs)).action!,
                occurrence: {
                  ...stateAt(tOf(abs)).action!.occurrence,
                  cycle: stateAt(tOf(abs)).action!.occurrence.cycle + 4,
                  start: stateAt(tOf(abs)).action!.occurrence.start + 4 * N,
                },
              },
            }
          : {}),
      });
  });

  it("finds the next occurrence for preloading", () => {
    expect(nextOccurrence(0)?.action.id).toBe("nod.k180");
    expect(nextOccurrence(0)?.start).toBe(N + 120);
    expect(nextOccurrence(N + 120 + 60)?.start).toBe(5 * N + 120);
    expect(nextOccurrence(N + 120 + 60, FX_ROT, BASE_LOOP, FX)?.action.id).toBe(
      "fx.k72",
    );
    expect(nextOccurrence(3 * N)?.start).toBe(5 * N + 120);
    expect(nextOccurrence(0, [])).toBeUndefined();
  });
});

describe("player decisions", () => {
  const at = (i: number) => stateAt(tOf(N + 120 + i));

  it("typing only: show base", () => {
    expect(decide(stateAt(tOf(10)), "base", false)).toEqual({ show: "base" });
  });

  it("enter window: prepare, then cut in once the clip is up", () => {
    const d = decide(at(61), "base", false);
    expect(d.show).toBe("base");
    expect(d.prepare).toEqual({ action: nod, clipFrame: 1 });
    expect(decide(at(61), "base", true).show).toBe("nod.k180");
  });

  it("core: keep the action; if it never came up, skip it rather than pop", () => {
    expect(decide(at(80), "nod.k180", true).show).toBe("nod.k180");
    expect(decide(at(80), "base", true)).toEqual({ show: "base" });
  });

  it("exit window: back to base", () => {
    expect(decide(at(110), "nod.k180", true)).toEqual({ show: "base" });
  });

  it("before the clip starts (lead-in outside the encoded clip): base, nothing to prepare", () => {
    expect(decide(at(10), "base", false)).toEqual({ show: "base" });
  });
});

describe("media time", () => {
  it("aims at the middle of a frame", () => {
    expect(frameTime(0, 12)).toBeCloseTo(1 / 24);
    expect(Math.floor(frameTime(215, 12) * 12)).toBe(215);
  });

  it("measures drift, wrap-aware for the loop", () => {
    expect(driftFrames(frameTime(10, 12), 10, 12)).toBeCloseTo(0);
    expect(driftFrames(frameTime(12, 12), 10, 12)).toBeCloseTo(2);
    // video at frame 1 just after wrapping, clock at frame 215: 2 frames ahead, not -214
    expect(driftFrames(frameTime(1, 12), 215, 12, 216)).toBeCloseTo(2);
    expect(driftFrames(frameTime(214, 12), 0, 12, 216)).toBeCloseTo(-2);
  });
});
