import {
  fixtureFamily,
  fixtureVariant,
  withFixtures,
} from "./__fixtures__/actions";
import {
  ACTIONS,
  BASE_LOOP,
  ENTRY_JOINS,
  NOD,
  validateAction,
  type ActionDef,
} from "./actions";
import { mod } from "./clock";
import { armEgg, initialEgg } from "./egg";
import { JOIN_CONFIGS } from "./join-config";
import {
  actionFrameAtBase,
  COOLDOWNS,
  earliestStart,
  entryKs,
  initialQueue,
  joinableKs,
  LEAD_FRAMES,
  nextVariant,
  REACTIONS,
  request,
  resolveState,
  rotationBusyUntil,
  setFrozen,
  step,
  type QueueEnv,
  type QueueState,
  type ReactionDef,
  variantsOf,
} from "./reactions";
import {
  clipEndAbs,
  decide,
  occurrenceState,
  stateAt,
  type Occurrence,
  type Rotation,
} from "./schedule";

const FPS = BASE_LOOP.fps;
const N = BASE_LOOP.frames;
const tOf = (abs: number) => abs / FPS;

/* Fixture reactions with a variant at every join (as design A ships): 36
   frame per-entry clips shaped like the S1a/S1b ones that wait on
   hero-reactions-s1a-s1b-t2 (no reaction clip is installed yet). */
const fixture = (id: ReactionDef["id"], priority: number): ReactionDef => ({
  id,
  priority,
  variants: fixtureFamily("fx"),
});
const env: QueueEnv = {
  reactions: {
    ...REACTIONS,
    speaker: fixture("speaker", 3),
    phone: fixture("phone", 3),
    sip: fixture("sip", 2),
  },
};

/** Runs the machine frame by frame from abs `from` to `to` (no rotation). */
function run(q: QueueState, from: number, to: number) {
  for (let abs = from; abs <= to; abs++) q = step(q, tOf(abs), abs, 0, env);
  return q;
}

describe("registry on the locked install (v5_2 option (a) + S1a V2)", () => {
  it("ships only the glance-up reaction (S1a); S1b/T2 wait for their locks", () => {
    expect(Object.keys(REACTIONS)).toEqual(["glance-up"]);
    const g = REACTIONS["glance-up"]!;
    expect(g.priority).toBe(3);
    expect(g.oncePerVisit).toBeUndefined();
    // One variant per join, each keyed by its own entry.
    expect(Object.keys(g.variants).map(Number)).toEqual([...ENTRY_JOINS]);
    for (const k of ENTRY_JOINS) {
      expect(g.variants[k]!.id).toBe(`s1a.k${k}`);
      expect(g.variants[k]!.entry).toBe(k);
    }
    expect(entryKs(g)).toEqual([...ENTRY_JOINS]);
    expect(Object.keys(ACTIONS).filter((id) => /^(s1b|t2)\./.test(id))).toEqual(
      [],
    );
    for (const id of ["speaker", "phone", "sip"] as const)
      expect(request(initialQueue(), id, 1)).toMatchObject({
        accepted: false,
        reason: "unknown",
      });
  });

  it("the nod is f180 only, on every join config", () => {
    for (const cfg of Object.values(JOIN_CONFIGS))
      expect(joinableKs(NOD, cfg)).toEqual([180]);
    expect(actionFrameAtBase(NOD, 180)).toBe(60);
    expect(Object.keys(variantsOf("nod"))).toEqual(["180"]);
  });
});

describe("once per visit", () => {
  const once: QueueEnv = {
    reactions: {
      sip: {
        id: "sip",
        priority: 2,
        variants: { 180: fixtureVariant(180) },
        oncePerVisit: true,
      },
    },
  };
  it("plays at f180, then is refused for the rest of the visit", () => {
    let q = request(initialQueue(), "sip", tOf(10), once).state;
    for (let abs = 10; abs <= 200; abs++) q = step(q, tOf(abs), abs, 0, once);
    expect(q.playing?.id).toBe("sip");
    expect(q.playing?.occ.start).toBe(180);
    expect(request(q, "sip", tOf(201), once)).toMatchObject({
      accepted: false,
      reason: "once",
    });
    for (let abs = 201; abs <= 240; abs++) q = step(q, tOf(abs), abs, 0, once);
    expect(q.playing).toBeUndefined();
    expect(request(q, "sip", tOf(240) + 600, once)).toMatchObject({
      accepted: false,
      reason: "once",
    });
  });

  it("a refusal while frozen doesn't use up the visit's play", () => {
    let q = setFrozen(initialQueue(), true);
    expect(request(q, "sip", 1, once)).toMatchObject({ reason: "frozen" });
    q = setFrozen(q, false);
    expect(request(q, "sip", 2, once).accepted).toBe(true);
  });
});

/*
 * JOIN SAFETY (lock review locks_now28 §4): the full composite at f0-f144
 * differs from f180 on the screen and spill (character 0/0), so an opaque
 * clip baked for one join must never come up at another. These tests drive
 * every path that can put a clip on screen (queue, egg, rotation) from every
 * start frame and check where the clip's first frame lands.
 */
describe("join safety: a clip only ever comes up at its own entry join", () => {
  const clipStartBase = (o: Occurrence) =>
    mod(o.start + o.action.clip.firstFrame, N);

  it("every installed clip validates and is joinable only at its entry", () => {
    for (const a of Object.values(ACTIONS)) {
      expect(validateAction(a)).toEqual([]);
      for (const cfg of Object.values(JOIN_CONFIGS))
        expect(joinableKs(a, cfg)).toEqual([a.entry]);
    }
  });

  it("queue: nod v4 as a reaction starts at f180 from every request frame", () => {
    const env1: QueueEnv = {
      reactions: {
        sip: { id: "sip", priority: 2, variants: variantsOf("nod") },
      },
    };
    for (let at = 0; at < N; at++) {
      let q = request(initialQueue(), "sip", tOf(at), env1).state;
      let abs = at;
      while (!q.playing && abs < at + 2 * N) {
        q = step(q, tOf(abs), abs, 0, env1);
        abs++;
      }
      expect(q.playing).toBeDefined();
      expect(clipStartBase(q.playing!.occ)).toBe(180);
    }
  });

  it("queue: per-entry variants each start on their own join, from every request frame", () => {
    for (let at = 0; at < N; at++) {
      let q = request(initialQueue(), "speaker", tOf(at), env).state;
      let abs = at;
      while (!q.playing && abs < at + 2 * N) {
        q = step(q, tOf(abs), abs, 0, env);
        abs++;
      }
      const occ = q.playing!.occ;
      expect(clipStartBase(occ)).toBe(occ.action.entry);
      expect(mod(abs - 1, N)).toBe(occ.action.entry);
    }
  });

  it("queue: a registry that maps a clip to a foreign join never shows it there", () => {
    const wrong: QueueEnv = {
      reactions: {
        sip: {
          id: "sip",
          priority: 2,
          variants: Object.fromEntries(ENTRY_JOINS.map((k) => [k, NOD])),
        },
      },
    };
    const starts: number[] = [];
    for (let at = 0; at < N; at += 5) {
      let q = request(initialQueue(), "sip", tOf(at), wrong).state;
      for (let abs = at; abs < at + 2 * N; abs++) {
        q = step(q, tOf(abs), abs, 0, wrong);
        if (q.playing) starts.push(clipStartBase(q.playing.occ));
      }
    }
    expect(starts.filter((k) => k !== 180)).toEqual([]);
    // The mis-keyed entries are ignored, so it still plays, at f180.
    expect(starts.length).toBeGreaterThan(0);
    expect(nextVariant(wrong.reactions!.sip!, 0)).toBe(NOD);
    expect(entryKs(wrong.reactions!.sip!)).toEqual([180]);
  });

  it("egg: the nod is armed only for f180, from every frame", () => {
    for (let abs = 0; abs < 2 * N; abs++) {
      const e = armEgg(initialEgg(), abs, 0);
      expect(mod(e.armed!.join, N)).toBe(180);
      expect(clipStartBase(e.armed!.occ)).toBe(180);
    }
  });

  it("rotation: the nod slot comes up at f180", () => {
    const rot: Rotation = [null, "nod.k180", null, null];
    const ups: number[] = [];
    for (let abs = 0; abs < 4 * N; abs++)
      if (stateAt(tOf(abs), rot).action?.clipFrame === 0) ups.push(mod(abs, N));
    expect(ups).toEqual([180]);
  });

  it("an occurrence placed off its entry is never on screen (last-line guard)", () => {
    for (const k of [0, 36, 72, 108, 144]) {
      const bad: Occurrence = { action: NOD, cycle: 0, start: k - 60 + N };
      for (let abs = bad.start; abs < bad.start + NOD.frames; abs++)
        expect(occurrenceState(abs, bad)).toBeUndefined();
    }
    const q: QueueState = {
      ...initialQueue(),
      playing: {
        id: "sip",
        occ: { action: NOD, cycle: 1, start: N + 36 - 60 },
      },
    };
    const r = resolveState(stateAt(tOf(N + 40), []), q);
    expect(r.action).toBeUndefined();
  });

  it("a clip whose enter window reaches a foreign join fails validation", () => {
    const a: ActionDef = {
      ...fixtureVariant(36),
      frames: 80,
      enterWindow: [0, 40],
      exitWindow: [70, 79],
      clip: { ...fixtureVariant(36).clip, frames: 80 },
    };
    expect(validateAction(a)).toContain(
      "fx.k36: enter window reaches the foreign join f72",
    );
  });
});

describe("queue: priority, newest, commit, cooldowns", () => {
  it("schedules at the next join at least LEAD_FRAMES away and plays there", () => {
    let q = request(initialQueue(), "speaker", tOf(30), env).state;
    q = step(q, tOf(30), 30, 0, env);
    expect(q.slot?.join).toBe(36);
    q = step(q, tOf(33), 33, 0, env); // 33 >= 36 - 4 -> locked
    expect(q.slot?.locked).toBe(true);
    q = run(q, 34, 36);
    expect(q.playing?.id).toBe("speaker");
    expect(q.slot).toBeUndefined();
    // Too close to a join: skips to the following one.
    let r = request(initialQueue(), "speaker", tOf(34), env).state;
    r = step(r, tOf(34), 34, 0, env);
    expect(r.slot?.join).toBe(72);
    expect(34 + LEAD_FRAMES).toBeGreaterThan(36);
  });

  it("higher priority replaces the queued request; equal priority: newest wins; lower is refused", () => {
    let q = request(initialQueue(), "sip", 0, env).state;
    let res = request(q, "speaker", 0.1, env);
    expect(res.accepted).toBe(true);
    q = res.state;
    res = request(q, "phone", 0.2, env);
    expect(res.accepted && res.state.slot?.id).toBe("phone");
    q = res.state;
    res = request(q, "sip", 0.3, env);
    expect(res).toMatchObject({ accepted: false, reason: "outranked" });
  });

  it("commit: a locked request can't be replaced, and nothing cancels it but freeze", () => {
    let q = request(initialQueue(), "sip", tOf(0), env).state;
    q = run(q, 0, 33);
    expect(q.slot?.locked).toBe(true);
    expect(request(q, "speaker", tOf(33), env)).toMatchObject({
      accepted: false,
      reason: "locked",
    });
    q = run(q, 34, 36);
    expect(q.playing?.id).toBe("sip");
  });

  it("same reaction: rejected for 30 s after it starts", () => {
    let q = request(initialQueue(), "speaker", tOf(0), env).state;
    q = run(q, 0, 80); // played f36-f71
    expect(q.playing).toBeUndefined();
    expect(q.lastStart.speaker).toBeCloseTo(3);
    expect(request(q, "speaker", 3 + COOLDOWNS.sameS - 0.1, env)).toMatchObject(
      { accepted: false, reason: "cooldown" },
    );
    expect(request(q, "speaker", 3 + COOLDOWNS.sameS, env).accepted).toBe(true);
  });

  it("any two starts at least 6 s apart (pushed to a later join, not refused)", () => {
    let q = request(initialQueue(), "speaker", tOf(0), env).state;
    q = run(q, 0, 36); // speaker starts at f36 (3 s), clip ends f72
    q = request(q, "phone", tOf(37), env).state;
    q = run(q, 37, 37);
    // f72 would be 3 s after the last start; the next join >= 9 s is f108.
    expect(q.slot?.join).toBe(108);
    expect(earliestStart(q, tOf(37))).toBeCloseTo(3 + COOLDOWNS.gapS);
  });

  it("at most 6 starts per minute", () => {
    const q: QueueState = {
      ...initialQueue(),
      starts: [0, 9, 18, 27, 36, 45],
    };
    expect(earliestStart(q, 50)).toBe(60);
  });
});

describe("freeze (WCAG 2.2.2) and the queue", () => {
  it("rejects requests while frozen and drops the queued one", () => {
    let q = request(initialQueue(), "speaker", 0, env).state;
    q = run(q, 0, 33);
    q = setFrozen(q, true);
    expect(q.slot).toBeUndefined();
    expect(request(q, "phone", 1, env)).toMatchObject({
      accepted: false,
      reason: "frozen",
    });
    // Stepping a frozen queue is a no-op (the clock is paused anyway).
    expect(step(q, 99, 999, 0, env)).toBe(q);
  });

  it("a reaction on screen when frozen continues after play", () => {
    let q = request(initialQueue(), "speaker", 0, env).state;
    q = run(q, 0, 40);
    q = setFrozen(q, true);
    expect(q.playing?.id).toBe("speaker");
    q = setFrozen(q, false);
    q = run(q, 41, 72);
    expect(q.playing).toBeUndefined();
  });

  it("stays frozen through hover reactions: a frozen queue never schedules", () => {
    let q = setFrozen(initialQueue(), true);
    for (const id of ["speaker", "phone", "sip"] as const)
      q = request(q, id, 1, env).state;
    expect(run(q, 0, 400)).toEqual(q);
  });
});

describe("reactions vs the auto-rotation", () => {
  it("wins over an overlapping rotation occurrence", () => {
    // Rotation cycle 1 schedules the nod (clip from abs 216+168 = 384).
    let q = request(initialQueue(), "speaker", tOf(370), env).state;
    q = run(q, 370, 396);
    expect(q.playing?.id).toBe("speaker"); // joined at 396 (f180)
    const rot = stateAt(tOf(396) + 1e-6);
    expect(rot.action?.occurrence.action.id).toBe("nod.k180"); // suppressed below
    const s = resolveState(rot, q);
    expect(s.action?.occurrence.action.spliceOffset).toBe(180);
    expect(decide(s, "base", true).show).toBe("fx.k180");
  });

  it("waits for a live rotation clip instead of cutting it", () => {
    const fx72 = fixtureVariant(72);
    const rot = stateAt(
      tOf(2 * N + 90) + 1e-6,
      [null, "nod.k180", fx72.id, null] as Rotation,
      BASE_LOOP,
      withFixtures(fx72),
    ); // a per-entry clip baked for f72, live in cycle 2
    const busy = rotationBusyUntil(rot);
    expect(busy).toBe(2 * N + 108);
    let q = request(initialQueue(), "speaker", tOf(2 * N + 90), env).state;
    q = step(q, tOf(2 * N + 90), 2 * N + 90, busy, env);
    expect(q.slot!.join).toBeGreaterThanOrEqual(busy);
    expect(q.slot!.join).toBe(2 * N + 108);
  });

  it("a per-entry reaction plays the clip baked for the next join", () => {
    let q = request(initialQueue(), "phone", tOf(10), env).state;
    for (let abs = 10; abs <= 50; abs++) q = step(q, tOf(abs), abs, 0, env);
    expect(q.playing?.occ.action.id).toBe("fx.k36");
    expect(q.playing?.occ.start).toBe(36);
    expect(clipEndAbs(q.playing!.occ)).toBe(72);
    const s = resolveState(stateAt(tOf(50) + 1e-6), q);
    expect(s.action?.clipFrame).toBe(14);
  });
});

describe("nextVariant (intent fetch target)", () => {
  it("is the clip for the next reachable join", () => {
    const def = env.reactions!.speaker!;
    expect(nextVariant(def, 0)?.id).toBe("fx.k36");
    expect(nextVariant(def, 30)?.id).toBe("fx.k36");
    expect(nextVariant(def, 33)?.id).toBe("fx.k72"); // 36 is inside the lead
    expect(nextVariant(def, 200)?.id).toBe("fx.k0"); // wraps to next cycle
    const nodOnly = { ...def, variants: variantsOf("nod") };
    expect(nextVariant(nodOnly, 0)).toBe(NOD);
    expect(nextVariant({ ...def, variants: {} }, 0)).toBeUndefined();
  });
});
