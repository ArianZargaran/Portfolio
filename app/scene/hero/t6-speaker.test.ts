/* T6 speaker groove v3 (LOCK_PAINTED_CHAR_ACTION_T6_SPEAKER_GROOVE_V3, Ari
   t1029s5606): six baked opaque crops t6.k0 .. t6.k180, screen included
   (H000 carries the Harvey-to-code screen fade). The lock review
   (designs/review_locks_now30/REVIEW.md §3) measured each variant at the
   FOREIGN entries at 69 to 15,688 px over 8 levels, so each may play only
   from its own entry join and returns to the loop at f(k+36).

   Covered here, on the real registry, queue, schedule, decide() and egg:
   - the registry (windows measured on the locked frames, own-entry joins);
   - own-join entry for every variant, from every request frame;
   - queue priority against the glance-up (both 3) and a lower-priority
     reaction (fixture at 2);
   - PLAN v3 §3 row 7: queen-poster then speakers within 10 s plays T6
     through the queue at its next own entry and arms the E2 nod as a
     one-shot at the first f180 at or after T6 ends (never inside the
     queue, never cutting T6). */
import { fixtureFamily } from "./__fixtures__/actions";
import {
  ACTIONS,
  BASE_LOOP,
  cutWindows,
  ENTRY_JOINS,
  NOD,
  validateAction,
  type ActionDef,
  type EntryJoin,
} from "./actions";
import { mod } from "./clock";
import {
  applyEgg,
  armEgg,
  EGG,
  eggBusyUntil,
  eggVisit,
  initialEgg,
  stepEgg,
  type EggState,
} from "./egg";
import { JOIN_CONFIGS } from "./join-config";
import {
  COOLDOWNS,
  cooldownKey,
  entryKs,
  initialQueue,
  joinableKs,
  LEAD_FRAMES,
  nextVariant,
  planReaction,
  REACTIONS,
  request,
  resolveState,
  rotationBusyUntil,
  step,
  type QueueEnv,
  type QueueState,
  type ReactionId,
} from "./reactions";
import {
  clipEndAbs,
  decide,
  heroRotation,
  onOwnEntry,
  stateAt,
  type ScheduleState,
  type Shown,
} from "./schedule";

const FPS = BASE_LOOP.fps;
const N = BASE_LOOP.frames;
const tOf = (abs: number) => abs / FPS;
const T6 = Object.fromEntries(
  ENTRY_JOINS.map((k) => [k, ACTIONS[`t6.k${k}`]]),
) as Record<EntryJoin, ActionDef>;
const SPEAKER = REACTIONS.speaker!;
const isT6 = (x: Shown) => x.startsWith("t6.");
/** The first join >= abs + LEAD_FRAMES (every join has a T6 variant). */
const nextJoin = (abs: number) => Math.ceil((abs + LEAD_FRAMES) / 36) * 36;

type Event =
  | { kind: "visit"; id: string }
  | { kind: "request"; id: ReactionId };

/**
 * The player's per-frame loop (hero-player.tsx), on pure state: hotspot
 * visits feed the egg (a completed sequence arms the nod on the next frame,
 * after T6 is scheduled), requests go through planReaction and are
 * scheduled at once (R1), then each frame: busyUntil, step, arm, stepEgg,
 * resolveState(applyEgg(...)), decide (clips always ready). Logs what shows.
 */
function player(
  from: number,
  to: number,
  events: Record<number, Event[]>,
  env: QueueEnv = {},
) {
  let q: QueueState = initialQueue();
  let egg: EggState = initialEgg();
  let pending = false;
  let busyUntil = 0;
  let shown: Shown = "base";
  const log: { abs: number; shown: Shown; egg: EggState; q: QueueState }[] = [];
  const plans: { abs: number; id: ReactionId; plan: string }[] = [];
  for (let abs = from; abs <= to; abs++) {
    const t = tOf(abs);
    for (const e of events[abs] ?? []) {
      if (e.kind === "visit") {
        const r = eggVisit(egg, e.id, t);
        egg = r.state;
        if (r.completed) pending = true;
      } else {
        const p = planReaction(q, e.id, t, abs, busyUntil, env);
        plans.push({ abs, id: e.id, plan: p.ok ? p.action.id : p.reason });
        if (p.ok)
          q = step(request(q, e.id, t, env).state, t, abs, busyUntil, env);
      }
    }
    const rot = stateAt(t, heroRotation(false));
    busyUntil = Math.max(rotationBusyUntil(rot), eggBusyUntil(egg, abs));
    q = step(q, t, abs, busyUntil, env);
    if (pending) {
      pending = false;
      const t6 =
        q.playing?.id === EGG.reaction
          ? q.playing.occ
          : q.slot?.id === EGG.reaction
            ? q.slot.occ
            : undefined;
      egg = armEgg(egg, abs, t6 ? clipEndAbs(t6) : 0);
    }
    egg = stepEgg(egg, abs, [
      q.slot?.occ,
      q.playing?.occ,
      rot.action?.occurrence,
    ]);
    const s = resolveState(applyEgg(rot, egg), q);
    shown = decide(s, shown, true).show;
    log.push({ abs, shown, egg, q });
  }
  return { log, plans };
}

/** Frames (abs) a clip id is on screen. */
const onFrames = (log: { abs: number; shown: Shown }[], id: string) =>
  log.filter((x) => x.shown === id).map((x) => x.abs);

describe("T6 v3: installed variants", () => {
  it("six variants, one per join, valid, joinable only at their own entry on every join config", () => {
    expect(Object.keys(T6).map(Number)).toEqual([...ENTRY_JOINS]);
    for (const k of ENTRY_JOINS) {
      const a = T6[k];
      expect(a).toMatchObject({
        id: `t6.k${k}`,
        family: "t6",
        entry: k,
        spliceOffset: k,
        frames: 36,
        fps: 12,
      });
      // Measured on the locked frames vs the v5_2 loop crop (p99.9 <= 4,
      // 0 px > 8): i0-i1 and i33-i35 equal the loop.
      expect(a.enterWindow).toEqual([0, 1]);
      expect(a.exitWindow).toEqual([33, 35]);
      expect(cutWindows(a)).toEqual({ enter: [0, 1], exit: [33, 35] });
      expect(a.clip).toMatchObject({ firstFrame: 0, frames: 36 });
      expect(a.lock).toBe(
        "LOCK_PAINTED_CHAR_ACTION_T6_SPEAKER_GROOVE_V3 (sha256 129bda2dd2c58afb35151b6a04dba9ac96ed56ed6d280afc0456dbf1673fa709)",
      );
      expect(validateAction(a)).toEqual([]);
      for (const cfg of Object.values(JOIN_CONFIGS))
        expect(joinableKs(a, cfg)).toEqual([k]);
      // Cooldown ledger: every variant counts as the one "speaker" reaction.
      expect(cooldownKey(a)).toBe("speaker");
    }
  });

  it("speaker is a priority-3 hotspot reaction keyed by each variant's own entry", () => {
    expect(SPEAKER.priority).toBe(3);
    expect(SPEAKER.priority).toBe(REACTIONS["glance-up"]!.priority);
    expect(entryKs(SPEAKER)).toEqual([...ENTRY_JOINS]);
    for (const k of ENTRY_JOINS) expect(SPEAKER.variants[k]).toBe(T6[k]);
  });

  it("the intent fetch target (and the plan) is the variant for the next reachable join, from every frame", () => {
    for (let abs = 0; abs < 2 * N; abs++) {
      const want = mod(nextJoin(abs), N);
      expect(nextVariant(SPEAKER, abs)!.id).toBe(`t6.k${want}`);
      const p = planReaction(initialQueue(), "speaker", tOf(abs), abs);
      expect(p).toMatchObject({
        ok: true,
        join: nextJoin(abs),
        action: { id: `t6.k${want}` },
      });
    }
  });
});

describe("T6 v3: plays only from its own join (real queue -> resolveState -> decide)", () => {
  it("from every request frame of two cycles: the right variant cuts in on its own entry, 33 frames, then the loop", () => {
    for (let at = 0; at < 2 * N; at++) {
      const { log } = player(at, at + 2 * N, {
        [at]: [{ kind: "request", id: "speaker" }],
      });
      const on = log.filter((x) => isT6(x.shown));
      const join = nextJoin(at);
      const k = mod(join, N);
      // (objects so a failure names the request frame)
      expect({ at, ids: [...new Set(on.map((x) => x.shown))] }).toEqual({
        at,
        ids: [`t6.k${k}`],
      });
      // i0..i32 on screen; i33..i35 (exit window) equal the loop -> base.
      expect({ at, first: on[0].abs, n: on.length }).toEqual({
        at,
        first: join,
        n: 33,
      });
      expect(on.map((x) => x.abs)).toEqual(
        Array.from({ length: 33 }, (_, i) => join + i),
      );
      // never visible on any other join
      const joins = ENTRY_JOINS as readonly number[];
      expect(
        on.map((x) => mod(x.abs, N)).filter((f) => joins.includes(f)),
      ).toEqual([k]);
    }
  });

  it("decide() refuses every T6 variant on a foreign entry (hand-built states; control: own entry shows)", () => {
    for (const k of ENTRY_JOINS)
      for (const j of ENTRY_JOINS) {
        const a = T6[k];
        // occurrence scheduled for join j (start j), clock on j
        const s: ScheduleState = {
          abs: N + j,
          baseFrame: j,
          cycle: 1,
          action: {
            occurrence: { action: a, cycle: 1, start: N + j },
            frame: 0,
            clipFrame: 0,
            phase: "enter",
          },
        };
        const d = decide(s, "base", true);
        const own = j === k;
        const want: Shown = own ? a.id : "base";
        expect({ k, j, own: onOwnEntry(s), show: d.show }).toEqual({
          k,
          j,
          own,
          show: want,
        });
      }
  });

  it("a request during the 30 s same-reaction cooldown plans and fetches nothing; after it, the next own-entry variant", () => {
    const { log, plans } = player(0, 3 * N, {
      0: [{ kind: "request", id: "speaker" }],
      100: [{ kind: "request", id: "speaker" }], // 36 s join started at 3 s: cooldown
      // 36 s after the start (f36 at 3 s): plan again
      [36 + COOLDOWNS.sameS * FPS + 1]: [{ kind: "request", id: "speaker" }],
    });
    expect(plans.map((p) => p.plan)).toEqual([
      "t6.k36",
      "cooldown",
      `t6.k${mod(nextJoin(36 + COOLDOWNS.sameS * FPS + 1), N)}`,
    ]);
    expect(onFrames(log, "t6.k36")[0]).toBe(36);
  });
});

describe("T6 v3: queue priority (PLAN v3 §3: one slot, higher priority wins, then the newest)", () => {
  it("a newer speaker request replaces a queued, unlocked glance (equal priority 3): only T6 plays", () => {
    const { log, plans } = player(0, N, {
      0: [{ kind: "request", id: "glance-up" }], // s1a.k36
      10: [{ kind: "request", id: "speaker" }], // replaces it, t6.k36
    });
    expect(plans.map((p) => p.plan)).toEqual(["s1a.k36", "t6.k36"]);
    expect(onFrames(log, "s1a.k36")).toEqual([]);
    expect(onFrames(log, "t6.k36")[0]).toBe(36);
  });

  it("a newer glance replaces a queued, unlocked speaker groove the same way", () => {
    const { log } = player(0, N, {
      0: [{ kind: "request", id: "speaker" }],
      10: [{ kind: "request", id: "glance-up" }],
    });
    expect(onFrames(log, "t6.k36")).toEqual([]);
    expect(onFrames(log, "s1a.k36")[0]).toBe(36);
  });

  it("a locked glance (within LEAD_FRAMES of its join) is not replaced: the speaker request is refused", () => {
    const { log, plans } = player(0, N, {
      0: [{ kind: "request", id: "glance-up" }],
      [36 - LEAD_FRAMES + 1]: [{ kind: "request", id: "speaker" }],
    });
    expect(plans.map((p) => p.plan)).toEqual(["s1a.k36", "locked"]);
    expect(onFrames(log, "s1a.k36")[0]).toBe(36);
    expect(log.some((x) => isT6(x.shown))).toBe(false);
  });

  it("while a glance plays, a speaker request waits for its end and the 6 s gap, then plays on its own entry", () => {
    const { log, plans } = player(0, 2 * N, {
      0: [{ kind: "request", id: "glance-up" }], // plays f36 (3 s)
      40: [{ kind: "request", id: "speaker" }],
    });
    // 6 s gap after the glance's start at f36 -> no start before f108
    expect(plans.map((p) => p.plan)).toEqual(["s1a.k36", "t6.k108"]);
    expect(onFrames(log, "s1a.k36")[0]).toBe(36);
    expect(onFrames(log, "t6.k108")[0]).toBe(108);
  });

  it("T6 (3) outranks a priority-2 reaction: it replaces it, and the lower one cannot replace T6", () => {
    const env: QueueEnv = {
      reactions: {
        ...REACTIONS,
        sip: { id: "sip", priority: 2, variants: fixtureFamily("fx") },
      },
    };
    let q = request(initialQueue(), "sip", 0, env).state;
    const r = request(q, "speaker", 0.5, env);
    expect(r.accepted).toBe(true);
    q = r.state;
    expect(q.slot).toMatchObject({ id: "speaker", priority: 3 });
    expect(request(q, "sip", 0.6, env)).toMatchObject({
      accepted: false,
      reason: "outranked",
    });
    const { log } = player(
      0,
      N,
      {
        0: [{ kind: "request", id: "sip" }],
        5: [{ kind: "request", id: "speaker" }],
        6: [{ kind: "request", id: "sip" }],
      },
      env,
    );
    expect(onFrames(log, "t6.k36")[0]).toBe(36);
    expect(log.some((x) => x.shown.startsWith("fx."))).toBe(false);
  });
});

describe("T6 v3 + E2: queen-poster then speakers within 10 s (PLAN v3 §3 row 7)", () => {
  /** Poster at abs p, speakers at abs s (visit then request, as triggers.ts sends them). */
  const egg = (p: number, s: number, to = p + 3 * N) =>
    player(p, to, {
      [p]: [
        { kind: "visit", id: "queen-poster" },
        { kind: "request", id: "glance-up" },
      ],
      [s]: [
        { kind: "visit", id: "speakers" },
        { kind: "request", id: "speaker" },
      ],
    });

  /*
   * Oracle for a poster visit at f0 (its glance-up asks for s1a.k36) and the
   * speakers at frame s (s <= 120, inside the 10 s window):
   * - s <= 32: the glance is still unlocked; T6 (equal priority, newer)
   *   replaces it and plays on the next join >= s + LEAD_FRAMES.
   * - s 33..36: the glance's slot is locked (it locks in f32's tick, starts
   *   in f36's; events run before the frame's tick). One queue slot (PLAN
   *   §3): the speaker request is refused, T6 does not play; the egg nod
   *   still arms outside the queue for the next f180. Known edge.
   * - s >= 37: the glance played at f36; T6 waits for the 6 s gap (f108)
   *   and plays on the next join >= max(s + LEAD_FRAMES, 108).
   * E2: the nod cuts in at the first f180 at or after T6's clip end.
   */
  const oracle = (s: number) => {
    const locked = s > 36 - LEAD_FRAMES && s <= 36;
    const glance = s > 36 - LEAD_FRAMES;
    const join = locked
      ? null
      : Math.ceil(Math.max(s + LEAD_FRAMES, glance ? 36 + 6 * FPS : 0) / 36) *
        36;
    const nodFrom = join === null ? 180 : join + 36;
    return {
      glanceAt: glance ? 36 : null,
      t6: join === null ? null : { id: `t6.k${mod(join, N)}`, at: join, n: 33 },
      nodAt: Math.ceil((nodFrom - 180) / N) * N + 180,
    };
  };
  const outcome = (s: number) => {
    const { log } = egg(0, s);
    const t6 = log.filter((x) => isT6(x.shown));
    const nodOn = onFrames(log, NOD.id);
    const glance = onFrames(log, "s1a.k36");
    return {
      glanceAt: glance.length ? glance[0] : null,
      t6: t6.length
        ? {
            id: [...new Set(t6.map((x) => x.shown))].join(","),
            at: t6[0].abs,
            n: t6.length,
          }
        : null,
      nodAt: nodOn[0],
      // contiguous, and never before T6's clip end
      nodContiguous: nodOn.every((a, i) => a === nodOn[0] + i),
      nodAfterT6: !t6.length || nodOn[0] >= t6[0].abs + 36,
    };
  };

  it("from every speakers frame of the 10 s window: T6 right away on its own next join (through the queue), then the nod at the first f180 at or after T6 ends", () => {
    for (let s = 1; s <= 10 * FPS; s++)
      expect({ s, ...outcome(s) }).toEqual({
        s,
        ...oracle(s),
        nodContiguous: true,
        nodAfterT6: true,
      });
    // the known one-slot edge covers exactly the LEAD_FRAMES lock window
    const refused = Array.from({ length: 10 * FPS }, (_, i) => i + 1).filter(
      (s) => outcome(s).t6 === null,
    );
    expect(refused).toEqual([33, 34, 35, 36]);
  });

  it("arms E2 as a one-shot: armed while T6 is queued/playing, then plays once and is gone", () => {
    const { log } = egg(0, 20); // T6 replaces the glance -> t6.k36
    const at = (abs: number) => log.find((x) => x.abs === abs)!;
    // armed on the frame after the speakers visit, for f180 (T6 ends f72)
    expect(at(21).egg.armed?.join).toBe(180);
    expect(at(21).egg.armed?.occ.action).toBe(NOD);
    expect(at(21).q.slot?.id).toBe("speaker");
    // E2 never occupies the queue slot
    expect(log.every((x) => x.q.slot?.id !== ("nod" as never))).toBe(true);
    expect(onFrames(log, "t6.k36")[0]).toBe(36);
    // nod v4 clip i60-131: f180 .. f35 of the next cycle, back to the loop
    const nodOn = onFrames(log, NOD.id);
    expect(nodOn[0]).toBe(180);
    expect(at(180).egg.playing).toBeDefined();
    expect(at(180).egg.armed).toBeUndefined();
    // one-shot: nothing armed or playing after the clip, and no second nod
    expect(at(N + 40).egg).toEqual({});
    expect(nodOn.every((a) => a < N + 36)).toBe(true);
  });

  it("T6 at f144 ends on f180: the nod follows back to back", () => {
    // poster at f0 (the glance plays at f36), speakers at f120 (10 s): the
    // next join is f144 (the 6 s gap after f36 allows f108 already).
    const { log } = egg(0, 120);
    expect(onFrames(log, "s1a.k36")[0]).toBe(36);
    const t6 = log.filter((x) => isT6(x.shown));
    expect(t6[0]).toMatchObject({ abs: 144, shown: "t6.k144" });
    const nodOn = onFrames(log, NOD.id);
    expect(nodOn[0]).toBe(180);
    // T6 shows to i32 (f176), the base f177-179 (identical pixels), the nod f180
    expect(t6[t6.length - 1].abs).toBe(176);
    expect(
      log.filter((x) => x.abs >= 177 && x.abs < 180).map((x) => x.shown),
    ).toEqual(["base", "base", "base"]);
  });

  it("T6 at f180 runs to f215: the nod waits for the next cycle's f180 (delayed by design, <= 18 s)", () => {
    // poster at f60 (glance s1a.k72 plays at f72), speakers 7.5 s later at
    // f150: the 6 s gap after f72 allows f144 at the earliest, f150 + lead
    // -> f180.
    const { log } = egg(60, 150);
    const t6 = log.filter((x) => isT6(x.shown));
    expect(onFrames(log, "s1a.k72")[0]).toBe(72);
    expect(t6[0].shown).toBe("t6.k180");
    expect(t6[0].abs).toBe(180);
    expect(onFrames(log, NOD.id)[0]).toBe(N + 180);
  });

  it("speakers later than 10 s after the poster: T6 still plays, but no E2", () => {
    const late = Math.ceil(10 * FPS) + 1;
    const { log } = egg(0, late);
    expect(log.some((x) => isT6(x.shown))).toBe(true);
    expect(log.some((x) => x.shown === NOD.id)).toBe(false);
    expect(log.every((x) => !x.egg.armed)).toBe(true);
  });

  it("speakers alone (no poster first): T6 only, no E2", () => {
    const { log } = player(0, 2 * N, {
      5: [
        { kind: "visit", id: "speakers" },
        { kind: "request", id: "speaker" },
      ],
    });
    expect(onFrames(log, "t6.k36")[0]).toBe(36);
    expect(log.some((x) => x.shown === NOD.id)).toBe(false);
  });

  it("exactly 10 s after the poster still completes the sequence", () => {
    const e = eggVisit(initialEgg(), "queen-poster", 1).state;
    expect(eggVisit(e, "speakers", 11).completed).toBe(true);
    expect(eggVisit(e, "speakers", 11.001).completed).toBe(false);
    expect(EGG.windowS).toBe(10);
    expect(EGG.reaction).toBe("speaker");
    expect(EGG.action).toBe(NOD);
  });
});
