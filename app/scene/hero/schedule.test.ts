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
} from "./schedule";

const FPS = BASE_LOOP.fps;
const N = BASE_LOOP.frames;
const LOOP_S = N / FPS; // 18 s
const tOf = (abs: number) => (abs + 0.5) / FPS;
const nod = ACTIONS.nod;

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
    expect(cutWindows(nod)).toEqual({ enter: [48, 60], exit: [110, 121] });
    expect(cutWindows(ACTIONS.bounce)).toEqual({
      enter: [72, 83],
      exit: [108, 119],
    });
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
    // Untrimmed clips: the nod (cycle 1, runs into cycle 2) collides with
    // a bounce scheduled in cycle 2.
    const full = (a: ActionDef): ActionDef => ({
      ...a,
      clip: { ...a.clip, firstFrame: 0, frames: a.frames },
    });
    const errs = validateRotation([null, "nod", "bounce"], BASE_LOOP, {
      nod: full(nod),
      bounce: full(ACTIONS.bounce),
    });
    expect(errs).toEqual([
      "nod@1 overlaps bounce@2",
      "nod@4 overlaps bounce@5",
    ]);
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
    for (let i = 0; i < 122; i++) {
      const s = stateAt(tOf(start + i));
      expect(s.action?.occurrence.action.id).toBe("nod");
      expect(s.action?.frame).toBe(i);
      expect(s.action?.clipFrame).toBe(i >= 48 ? i - 48 : -1);
    }
    expect(stateAt(tOf(start + nod.frames)).action?.occurrence.action.id).toBe(
      "bounce",
    );
    expect(decide(stateAt(tOf(start + 140)), "base", true)).toEqual({
      show: "base",
    });
  });

  it("phases: enter until f60, core f61-109, exit from f110", () => {
    const at = (i: number) => stateAt(tOf(N + 120 + i)).action?.phase;
    expect(at(60)).toBe("enter");
    expect(at(61)).toBe("core");
    expect(at(109)).toBe("core");
    expect(at(110)).toBe("exit");
  });

  it("the bounce in cycle 2 does not steal the nod's core (clip coverage wins)", () => {
    // Nominally the bounce starts at cycle 2 frame 0 = nod frame 96 (core).
    const s = stateAt(tOf(2 * N + 0));
    expect(s.action?.occurrence.action.id).toBe("nod");
    expect(s.action?.phase).toBe("core");
    const b = stateAt(tOf(2 * N + 90));
    expect(b.action?.occurrence.action.id).toBe("bounce");
    expect(b.action?.frame).toBe(90);
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
    expect(nextOccurrence(0)?.action.id).toBe("nod");
    expect(nextOccurrence(0)?.start).toBe(N + 120);
    expect(nextOccurrence(N + 120 + 48)?.action.id).toBe("bounce");
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
    const d = decide(at(50), "base", false);
    expect(d.show).toBe("base");
    expect(d.prepare).toEqual({ action: nod, clipFrame: 2 });
    expect(decide(at(50), "base", true).show).toBe("nod");
  });

  it("core: keep the action; if it never came up, skip it rather than pop", () => {
    expect(decide(at(80), "nod", true).show).toBe("nod");
    expect(decide(at(80), "base", true)).toEqual({ show: "base" });
  });

  it("exit window: back to base", () => {
    expect(decide(at(110), "nod", true)).toEqual({ show: "base" });
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
