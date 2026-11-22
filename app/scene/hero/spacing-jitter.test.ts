/* Live-review S1 (preview 2c3acaf): the 6 s spacing must not depend on the
   sub-frame phase of the tick. The player ticks on rAF, so the clock time of
   a tick sits anywhere inside its frame; before the fix a start was recorded
   at the raw tick time and the gap converted back with the current tick's
   phase, so a groove asked for within 6 s of a glance flipped between
   t6.k108 and t6.k144 from tick to tick (fetch/abort churn, a dropped slot).
   These tests drive the real queue (request / planReaction / step /
   abandonedFetches / fetchDue) with a different sub-frame phase on every
   tick and require ONE plan, ONE fetch per clip, no abort, and the groove
   playing at its planned join. */
import { BASE_LOOP, type ActionId } from "./actions";
import { absFrameAt } from "./clock";
import {
  abandonedFetches,
  COOLDOWNS,
  cooldownAllows,
  earliestStart,
  fetchDue,
  frameAtOrAfter,
  frameOffset,
  frameStartTime,
  gateRotation,
  initialQueue,
  initialRotationGate,
  planReaction,
  request,
  step,
  type QueueState,
} from "./reactions";
import { heroRotation, stateAt } from "./schedule";

const FPS = BASE_LOOP.fps;

/** Deterministic pseudo-random sub-frame phases in [0, 1). */
function phases(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 2 ** 32;
  };
}

/**
 * Ticks the queue like the player: several ticks per frame at jittered
 * clock times, glance requested at `glanceAt`, groove at `grooveAt`.
 * Records every plan of the groove's slot, fetch starts and aborts.
 */
function simulate(seed: number, glanceAt: number, grooveAt: number) {
  const rnd = phases(seed);
  let q: QueueState = initialQueue();
  const inFlight = new Set<ActionId>();
  const fetches: string[] = [];
  const aborts: string[] = [];
  const plans = new Set<string>();
  let played: { id: string; start: number; tStart: number } | undefined;
  const firstPlan: string[] = [];
  for (let abs = 0; abs <= 160; abs++) {
    const ticks = 1 + Math.floor(rnd() * 5);
    for (let k = 0; k < ticks; k++) {
      const t = (abs + rnd() * 0.999) / FPS;
      expect(absFrameAt(t, FPS)).toBe(abs);
      if (k === 0 && abs === glanceAt)
        q = step(request(q, "glance-up", t).state, t, abs);
      if (k === 0 && abs === grooveAt) {
        const p = planReaction(q, "speaker", t, abs);
        firstPlan.push(p.ok ? p.action.id : p.reason);
        q = step(request(q, "speaker", t).state, t, abs);
      }
      const before = q.playing;
      q = step(q, t, abs);
      if (q.playing && q.playing !== before && q.playing.id === "speaker")
        played = {
          id: q.playing.occ.action.id,
          start: abs,
          tStart: q.lastStart.speaker!,
        };
      if (q.slot?.id === "speaker" && q.slot.occ)
        plans.add(q.slot.occ.action.id);
      for (const id of abandonedFetches(q, inFlight)) {
        inFlight.delete(id);
        aborts.push(id);
      }
      const occ = q.slot?.occ;
      if (occ && !inFlight.has(occ.action.id) && fetchDue(occ, abs)) {
        inFlight.add(occ.action.id);
        fetches.push(occ.action.id);
      }
      // A fetch "lands" 4 frames after it starts (kept in flight until the
      // reaction plays, the worst case for the abort path).
      if (q.playing) inFlight.delete(q.playing.occ.action.id);
    }
  }
  return { firstPlan, plans, fetches, aborts, played };
}

describe("6 s spacing is frame-stable under tick jitter (live-review S1)", () => {
  // Glance at f20 -> s1a.k36 (plays f36). Groove at f60 / f41 / f70:
  // f36 + 72 = f108 is the earliest join the 6 s gap allows.
  it.each(
    Array.from({ length: 40 }, (_, i) => [i + 1, [60, 41, 70][i % 3]] as const),
  )(
    "seed %i, groove at f%i: one plan (t6.k108), one fetch, no abort, plays at f108",
    (seed, grooveAt) => {
      const r = simulate(seed, 20, grooveAt);
      expect(r.firstPlan).toEqual(["t6.k108"]);
      expect([...r.plans]).toEqual(["t6.k108"]);
      expect(r.fetches.filter((x) => x.startsWith("t6."))).toEqual(["t6.k108"]);
      expect(r.fetches.filter((x) => x.startsWith("s1a."))).toEqual([
        "s1a.k36",
      ]);
      expect(r.aborts).toEqual([]);
      expect(r.played?.id).toBe("t6.k108");
      expect(r.played?.start).toBe(108);
      // Recorded at the join frame's start, whatever the tick's phase.
      expect(r.played?.tStart).toBeCloseTo(108 / FPS, 9);
    },
  );

  it("records a start at its join frame's clock time, not the tick's", () => {
    let q = initialQueue();
    q = step(request(q, "glance-up", 1.7).state, 1.7, 20);
    q = step(q, (36 + 0.83) / FPS, 36);
    expect(q.playing?.occ.action.id).toBe("s1a.k36");
    expect(q.lastStart["glance-up"]).toBeCloseTo(3, 12);
    expect(q.starts).toEqual([q.lastStart["glance-up"]]);
    // The next start is allowed from f108 on, from any phase of f107/f108.
    for (const ph of [0, 0.001, 0.4, 0.999]) {
      expect(
        frameAtOrAfter(
          earliestStart(q, (60 + ph) / FPS),
          (60 + ph) / FPS,
          60,
          FPS,
        ),
      ).toBe(108);
      expect(cooldownAllows(q, "speaker", (108 + ph) / FPS)).toBe(true);
      expect(cooldownAllows(q, "speaker", (107 + ph) / FPS)).toBe(false);
    }
  });

  it("frame helpers keep a whole-frame offset when t and abs are not aligned", () => {
    expect(frameOffset(10.5 / FPS, 10, FPS)).toBe(0);
    expect(frameOffset(-1e-12, 0, FPS)).toBe(0);
    expect(frameOffset(0, 100, FPS)).toBe(-100);
    expect(frameStartTime(36, 0, 0, FPS)).toBe(3);
    expect(frameStartTime(136, 0, 100, FPS)).toBeCloseTo(3, 12);
    expect(frameAtOrAfter(3, 0, 100, FPS)).toBe(136);
    expect(frameAtOrAfter(3 + COOLDOWNS.gapS, 0.4 / FPS, 0, FPS)).toBe(108);
  });

  it("a tick a hair before a frame boundary (absFrameAt's 1e-9 tolerance) plans the same join", () => {
    let q = initialQueue();
    q = step(request(q, "glance-up", 1.7).state, 1.7, 20);
    q = step(q, 36 / FPS, 36); // s1a.k36 starts at 3 s
    // t * fps is 59.99999999995 but absFrameAt says frame 60.
    const t = (60 - 5e-11) / FPS;
    expect(absFrameAt(t, FPS)).toBe(60);
    const p = planReaction(q, "speaker", t, 60);
    expect(p.ok && p.action.id).toBe("t6.k108");
    const s = step(request(q, "speaker", t).state, t, 60);
    expect(s.slot?.occ?.action.id).toBe("t6.k108");
  });

  it("a rotation play is recorded at its first clip frame's start, whatever the tick's phase", () => {
    const rot = heroRotation(true); // the nod slot (FEATURE_HERO_ROTATION_NOD)
    for (const ph of [0, 0.37, 0.93]) {
      let gate = initialRotationGate();
      let q = initialQueue();
      let recorded: { at: number; want: number } | undefined;
      for (
        let abs = 0;
        abs < 4 * BASE_LOOP.frames && recorded === undefined;
        abs++
      ) {
        const t = (abs + ph) / FPS;
        const st = stateAt(t, rot);
        const r = gateRotation(q, gate, st, t, () => true);
        q = r.queue;
        gate = r.gate;
        if (r.gate.allowed && q.starts.length) {
          const occ = st.action!.occurrence;
          recorded = {
            at: q.starts[0],
            want: (occ.start + occ.action.clip.firstFrame) / FPS,
          };
        }
      }
      expect(recorded).toBeDefined();
      expect(recorded!.at).toBeCloseTo(recorded!.want, 9);
    }
  });
});
