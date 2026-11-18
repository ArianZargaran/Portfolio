import { ACTIONS, BASE_LOOP, type ActionDef } from "./actions";
import { JOIN_V5_1 } from "./join-config";
import {
  actionFrameAtBase,
  COOLDOWNS,
  earliestStart,
  initialQueue,
  joinableKs,
  LEAD_FRAMES,
  REACTIONS,
  request,
  resolveState,
  rotationBusyUntil,
  setFrozen,
  step,
  type QueueEnv,
  type QueueState,
  type ReactionDef,
} from "./reactions";
import { clipEndAbs, decide, stateAt } from "./schedule";

const FPS = BASE_LOOP.fps;
const N = BASE_LOOP.frames;
const tOf = (abs: number) => abs / FPS;

/* Fixture reactions with a variant at every join (as design A will ship),
   built from the bounce clip's shape but re-targeted per join. */
const fixture = (id: ReactionDef["id"], priority: number): ReactionDef => ({
  id,
  priority,
  variants: Object.fromEntries(
    JOIN_V5_1.points.map((k) => [
      k,
      {
        ...ACTIONS.bounce,
        id: "bounce",
        frames: 36,
        spliceOffset: k,
        enterWindow: [0, 0],
        exitWindow: [30, 35],
        clip: { ...ACTIONS.bounce.clip, firstFrame: 0, frames: 36 },
      } satisfies ActionDef,
    ]),
  ),
});
const env: QueueEnv = {
  reactions: {
    bounce: REACTIONS.bounce,
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

describe("registry on the current 18 s loop", () => {
  it("bounce joins only at f72 (its clip's cut window), the nod only at f180", () => {
    expect(joinableKs(ACTIONS.bounce)).toEqual([72]);
    expect(joinableKs(ACTIONS.nod)).toEqual([180]);
    expect(Object.keys(REACTIONS.bounce!.variants)).toEqual(["72"]);
    expect(actionFrameAtBase(ACTIONS.nod, 180)).toBe(60);
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
    for (const id of ["speaker", "phone", "sip", "bounce"] as const)
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
    expect(rot.action?.occurrence.action.id).toBe("nod"); // suppressed below
    const s = resolveState(rot, q);
    expect(s.action?.occurrence.action.spliceOffset).toBe(180);
    expect(decide(s, "base", true).show).toBe("bounce");
  });

  it("waits for a live rotation clip instead of cutting it", () => {
    const rot = stateAt(tOf(2 * N + 90) + 1e-6); // the rotation bounce, live
    const busy = rotationBusyUntil(rot);
    expect(busy).toBe(2 * N + 120);
    let q = request(initialQueue(), "speaker", tOf(2 * N + 90), env).state;
    q = step(q, tOf(2 * N + 90), 2 * N + 90, busy, env);
    expect(q.slot!.join).toBeGreaterThanOrEqual(busy);
    expect(q.slot!.join).toBe(2 * N + 144);
  });

  it("the current bounce reaction plays the shipped clip at f72", () => {
    let q = request(initialQueue(), "bounce", tOf(10)).state;
    for (let abs = 10; abs <= 80; abs++) q = step(q, tOf(abs), abs);
    expect(q.playing?.occ.start).toBe(0);
    expect(clipEndAbs(q.playing!.occ)).toBe(120);
    const s = resolveState(stateAt(tOf(80) + 1e-6), q);
    expect(s.action?.clipFrame).toBe(8);
  });
});
