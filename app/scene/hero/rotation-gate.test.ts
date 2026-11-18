import { ACTIONS, BASE_LOOP } from "./actions";
import {
  COOLDOWNS,
  gateRotation,
  initialQueue,
  initialRotationGate,
  request,
  rotationBusyUntil,
  type QueueState,
  type RotationGate,
} from "./reactions";
import {
  HERO_ROTATION,
  heroRotation,
  stateAt,
  type Rotation,
} from "./schedule";

const FPS = BASE_LOOP.fps;
const N = BASE_LOOP.frames;
const tOf = (abs: number) => abs / FPS;
const bounceStart = (cycle: number) =>
  cycle * N + ACTIONS.bounce.spliceOffset + ACTIONS.bounce.clip.firstFrame;

/** Runs the gate frame by frame; returns the ids/frames that actually showed. */
function run(
  from: number,
  to: number,
  rotation: Rotation,
  q: QueueState = initialQueue(),
  fetched = () => true,
) {
  let gate: RotationGate = initialRotationGate();
  const plays: { id: string; abs: number }[] = [];
  let last: number | undefined;
  for (let abs = from; abs < to; abs++) {
    const r = gateRotation(
      q,
      gate,
      stateAt(tOf(abs), rotation),
      tOf(abs),
      fetched,
    );
    q = r.queue;
    gate = r.gate;
    const occ = r.rotation.action?.occurrence;
    if (occ && occ.start !== last) plays.push({ id: occ.action.id, abs });
    last = occ?.start;
  }
  return { plays, q };
}

describe("auto-rotation: nod slot behind FEATURE_HERO_ROTATION_NOD (review N1)", () => {
  it("drops the nod by default and keeps the draft only with the flag", () => {
    expect(heroRotation()).toEqual([null, null, "bounce", null]);
    expect(heroRotation(false)).toEqual([null, null, "bounce", null]);
    expect(heroRotation(true)).toEqual(HERO_ROTATION);
  });

  it("default rotation never shows the nod over 3 rotations", () => {
    const { plays } = run(0, 12 * N, heroRotation());
    expect(plays.map((p) => p.id)).toEqual(["bounce", "bounce", "bounce"]);
  });

  it("with the flag on, nod and bounce both play (they are 15 s apart)", () => {
    const { plays } = run(0, 4 * N, heroRotation(true));
    expect(plays.map((p) => p.id)).toEqual(["nod", "bounce"]);
  });
});

describe("auto-rotation: every replay respects the cooldowns (review N1)", () => {
  const rot = heroRotation();

  it("records each rotation play in the cooldown ledger", () => {
    const { q } = run(0, 3 * N, rot);
    expect(q.lastStart.bounce).toBeCloseTo(tOf(bounceStart(2)), 6);
    expect(q.starts).toHaveLength(1);
    // A bounce reaction right after is refused by the same-reaction cooldown.
    const t = tOf(bounceStart(2)) + 5;
    expect(request(q, "bounce", t)).toMatchObject({
      accepted: false,
      reason: "cooldown",
    });
    expect(
      request(q, "bounce", tOf(bounceStart(2)) + COOLDOWNS.sameS).accepted,
    ).toBe(true);
  });

  it("skips the rotation bounce when a bounce reaction started < 30 s before", () => {
    const tB = tOf(bounceStart(2));
    const q = {
      ...initialQueue(),
      lastStart: { bounce: tB - 20 },
      starts: [tB - 20],
    };
    const { plays } = run(2 * N, 3 * N, rot, q);
    expect(plays).toEqual([]);
  });

  it("skips it when any reaction started < 6 s before (gap)", () => {
    const tB = tOf(bounceStart(2));
    const q = {
      ...initialQueue(),
      lastStart: { speaker: tB - 3 },
      starts: [tB - 3],
    };
    expect(run(2 * N, 3 * N, rot, q).plays).toEqual([]);
    const ok = {
      ...initialQueue(),
      lastStart: { speaker: tB - 7 },
      starts: [tB - 7],
    };
    expect(run(2 * N, 3 * N, rot, ok).plays.map((p) => p.id)).toEqual([
      "bounce",
    ]);
  });

  it("skips it when 6 starts already happened in the last minute", () => {
    const tB = tOf(bounceStart(2));
    const starts = [50, 43, 36, 29, 22, 15].map((d) => tB - d);
    const q = { ...initialQueue(), starts };
    expect(run(2 * N, 3 * N, rot, q).plays).toEqual([]);
  });

  it("skips it while frozen or while a reaction plays, and doesn't charge it", () => {
    const frozen = run(2 * N, 3 * N, rot, initialQueue(true));
    expect(frozen.plays).toEqual([]);
    expect(frozen.q.starts).toEqual([]);
  });

  it("never plays or reserves busy time for an unfetched clip (review N2)", () => {
    let q = initialQueue();
    let gate = initialRotationGate();
    for (let abs = 2 * N; abs < 3 * N; abs++) {
      const r = gateRotation(
        q,
        gate,
        stateAt(tOf(abs), rot),
        tOf(abs),
        () => false,
      );
      q = r.queue;
      gate = r.gate;
      expect(r.rotation.action).toBeUndefined();
      expect(rotationBusyUntil(r.rotation)).toBe(0);
    }
    expect(q.starts).toEqual([]);
  });

  it("plays a clip fetched late, as long as it lands before the clip starts", () => {
    let fetched = false;
    let q = initialQueue();
    let gate = initialRotationGate();
    const shown: number[] = [];
    for (let abs = 2 * N; abs < 3 * N; abs++) {
      if (abs === bounceStart(2) - 2) fetched = true;
      const r = gateRotation(
        q,
        gate,
        stateAt(tOf(abs), rot),
        tOf(abs),
        () => fetched,
      );
      q = r.queue;
      gate = r.gate;
      if (
        r.rotation.action?.clipFrame !== undefined &&
        r.rotation.action.clipFrame >= 0
      )
        shown.push(abs);
    }
    expect(shown[0]).toBe(bounceStart(2));
  });
});
