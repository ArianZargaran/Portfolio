/**
 * Review N1: planReaction is the dry run the player makes BEFORE it fetches
 * a glance clip. It must refuse exactly what `request` refuses (so a hover
 * during the cooldown downloads nothing) and name the variant `step` will
 * actually schedule (the gap / busy pushes included), at its own entry.
 */
import { fixtureFamily } from "./__fixtures__/actions";
import { ACTIONS, BASE_LOOP } from "./actions";
import { mod } from "./clock";
import {
  COOLDOWNS,
  initialQueue,
  LEAD_FRAMES,
  nextVariant,
  planReaction,
  REACTIONS,
  request,
  setFrozen,
  step,
  type QueueEnv,
  type QueueState,
} from "./reactions";

const FPS = BASE_LOOP.fps;
const N = BASE_LOOP.frames;
const tOf = (abs: number) => abs / FPS;
const env: QueueEnv = {
  reactions: {
    ...REACTIONS,
    speaker: { id: "speaker", priority: 3, variants: fixtureFamily("fx") },
  },
};
function run(q: QueueState, from: number, to: number, e: QueueEnv = {}) {
  for (let abs = from; abs <= to; abs++) q = step(q, tOf(abs), abs, 0, e);
  return q;
}
const planned = (p: ReturnType<typeof planReaction>) =>
  p.ok ? p.action.id : p.reason;

describe("planReaction (dry run before any glance fetch, review N1)", () => {
  it("a fresh glance plans the next own-entry variant at least LEAD_FRAMES out", () => {
    expect(planned(planReaction(initialQueue(), "glance-up", 0, 0))).toBe(
      "s1a.k36",
    );
    expect(
      planned(planReaction(initialQueue(), "glance-up", tOf(33), 33)),
    ).toBe("s1a.k72"); // 36 is inside the lead
    expect(
      planned(planReaction(initialQueue(), "glance-up", tOf(200), 200)),
    ).toBe("s1a.k0"); // next cycle
  });

  it("agrees with nextVariant whenever nothing pushes the join", () => {
    for (let abs = 0; abs < 2 * N; abs++) {
      const p = planReaction(initialQueue(), "glance-up", tOf(abs), abs);
      expect(p.ok).toBe(true);
      if (!p.ok) continue;
      expect(p.action).toBe(nextVariant(REACTIONS["glance-up"]!, abs));
      expect(p.join - abs).toBeGreaterThanOrEqual(LEAD_FRAMES);
      expect({ abs, entry: mod(p.join, N) }).toEqual({
        abs,
        entry: p.action.entry,
      });
      expect(p.occ.start + p.action.clip.firstFrame).toBe(p.join);
    }
  });

  it("during the 30 s cooldown after a glance started it plans nothing", () => {
    let q = request(initialQueue(), "glance-up", 0).state;
    q = run(q, 0, 80); // glance plays f36-f71 (starts at 3 s)
    expect(q.lastStart["glance-up"]).toBeCloseTo(3);
    for (const t of [6, 10, 20, 3 + COOLDOWNS.sameS - 0.05])
      expect(planReaction(q, "glance-up", t, Math.round(t * FPS))).toEqual({
        ok: false,
        reason: "cooldown",
      });
    const after = 3 + COOLDOWNS.sameS;
    expect(
      planReaction(q, "glance-up", after, Math.round(after * FPS)).ok,
    ).toBe(true);
  });

  it("while the glance is playing or locked in its slot it plans nothing", () => {
    let q = request(initialQueue(), "glance-up", 0).state;
    q = run(q, 0, 33); // locked for f36
    expect(q.slot?.locked).toBe(true);
    expect(planReaction(q, "glance-up", tOf(33), 33).ok).toBe(false);
    q = run(q, 34, 40); // playing
    expect(q.playing?.id).toBe("glance-up");
    expect(planReaction(q, "glance-up", tOf(40), 40).ok).toBe(false);
  });

  it("frozen, or an unknown reaction: nothing", () => {
    const frozen = setFrozen(initialQueue(), true);
    expect(planReaction(frozen, "glance-up", 0, 0).ok).toBe(false);
    expect(planReaction(initialQueue(), "sip", 0, 0)).toEqual({
      ok: false,
      reason: "unknown",
    });
  });

  it("the 6 s gap pushes the plan to the variant step will really use", () => {
    let q = request(initialQueue(), "speaker", tOf(0), env).state;
    q = run(q, 0, 36, env); // speaker starts f36 (3 s)
    // nextVariant would say k72; the gap makes it f108 (>= 9 s).
    expect(nextVariant(REACTIONS["glance-up"]!, 37)?.id).toBe("s1a.k72");
    expect(planned(planReaction(q, "glance-up", tOf(37), 37, 0, env))).toBe(
      "s1a.k108",
    );
  });

  it("busyUntil (live rotation clip / committed egg nod) pushes the plan", () => {
    expect(
      planned(planReaction(initialQueue(), "glance-up", tOf(10), 10, 150)),
    ).toBe("s1a.k180");
  });

  it("is pure: the queue passed in is not changed", () => {
    const q = request(initialQueue(), "glance-up", 0).state;
    const before = structuredClone(q);
    planReaction(q, "glance-up", tOf(5), 5);
    expect(q).toEqual(before);
  });

  it("every planned action is an installed S1a variant", () => {
    for (let abs = 0; abs < N; abs += 7) {
      const p = planReaction(initialQueue(), "glance-up", tOf(abs), abs);
      expect(p.ok && ACTIONS[p.action.id]?.family).toBe("s1a");
    }
  });
});
