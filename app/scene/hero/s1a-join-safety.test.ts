/* S1a glance-up v2 (LOCK_PAINTED_CHAR_ACTION_S1A_GLANCE_UP_V2, Ari
   t1014s5523): six baked opaque crops, s1a.k0 .. s1a.k180, screen included.
   The lock review (designs/review_locks_now29/REVIEW.md §3, note B) measured
   each variant at the FOREIGN entries: 69 to 15,688 px over 8 levels, all on
   the screen and spill. So each variant may play only at its own entry join.
   These tests run the real registry through the real queue, schedule and
   decide(), from every request frame, and then mutate the inputs (in the
   style of the M10b nod test) to show a wrong-entry S1a is caught. */
import { ACTIONS, BASE_LOOP, ENTRY_JOINS, validateAction } from "./actions";
import type { ActionDef, ActionId, EntryJoin } from "./actions";
import { mod } from "./clock";
import { HERO_JOIN, JOIN_CONFIGS } from "./join-config";
import {
  entryKs,
  initialQueue,
  joinableKs,
  nextVariant,
  REACTIONS,
  request,
  resolveState,
  rotationBusyUntil,
  step,
  type QueueEnv,
  type QueueState,
  type ReactionDef,
} from "./reactions";
import {
  decide,
  heroRotation,
  occurrenceState,
  onOwnEntry,
  stateAt,
  type Occurrence,
  type Rotation,
  type ScheduleState,
  type Shown,
} from "./schedule";

const FPS = BASE_LOOP.fps;
const N = BASE_LOOP.frames;
const tOf = (abs: number) => abs / FPS;
const S1A = Object.fromEntries(
  ENTRY_JOINS.map((k) => [k, ACTIONS[`s1a.k${k}`]]),
) as Record<EntryJoin, ActionDef>;
const GLANCE = REACTIONS["glance-up"]!;
const isS1a = (x: Shown) => x.startsWith("s1a.");
const entryOf = (x: Shown) => Number(x.slice("s1a.k".length));

/** Player loop (as hero-player.tsx): step the queue, resolve, decide. Records every frame. */
function simulate(
  at: number,
  frames: number,
  opts: {
    rotation?: Rotation;
    env?: QueueEnv;
    reactionId?: "glance-up" | "sip";
  } = {},
) {
  const rotation = opts.rotation ?? heroRotation(false);
  const env = opts.env ?? {};
  let q: QueueState = request(
    initialQueue(),
    opts.reactionId ?? "glance-up",
    tOf(at),
    env,
  ).state;
  let shown: Shown = "base";
  const log: { abs: number; shown: Shown }[] = [];
  for (let abs = at; abs < at + frames; abs++) {
    const rot = stateAt(tOf(abs), rotation);
    q = step(q, tOf(abs), abs, rotationBusyUntil(rot), env);
    const s = resolveState(rot, q);
    shown = decide(s, shown, true).show;
    log.push({ abs, shown });
  }
  return log;
}

/** Every frame an S1a variant is on screen must be inside its own window [entry, entry+35]; it must come up exactly on its entry. */
function assertOnlyOwnEntry(log: { abs: number; shown: Shown }[]) {
  let prev: Shown = "base";
  for (const { abs, shown } of log) {
    if (isS1a(shown)) {
      const k = entryOf(shown);
      // (objects so a failure names the clip and frame)
      expect({
        shown,
        f: mod(abs, N),
        inOwnWindow: mod(abs - k, N) < 36,
      }).toEqual({ shown, f: mod(abs, N), inOwnWindow: true });
      if (prev !== shown)
        expect({ shown, cutInAt: mod(abs, N) }).toEqual({ shown, cutInAt: k });
      // never on any other join
      const f = mod(abs, N);
      if ((ENTRY_JOINS as readonly number[]).includes(f)) expect(f).toBe(k);
    }
    prev = shown;
  }
}

describe("S1a v2: installed variants", () => {
  it("six variants, one per join, each valid and joinable only at its own entry on every join config", () => {
    expect(Object.keys(S1A).map(Number)).toEqual([...ENTRY_JOINS]);
    for (const k of ENTRY_JOINS) {
      const a = S1A[k];
      expect(a.id).toBe(`s1a.k${k}`);
      expect(a.entry).toBe(k);
      expect(a.spliceOffset).toBe(k);
      expect(a.frames).toBe(36);
      expect(a.enterWindow).toEqual([0, 0]); // only i0 equals the loop: cut-in exactly on f<k>
      expect(a.exitWindow).toEqual([32, 35]);
      expect(a.clip).toMatchObject({ firstFrame: 0, frames: 36 });
      expect(a.lock).toContain("LOCK_PAINTED_CHAR_ACTION_S1A_GLANCE_UP_V2");
      expect(validateAction(a)).toEqual([]);
      for (const cfg of Object.values(JOIN_CONFIGS))
        expect(joinableKs(a, cfg)).toEqual([k]);
    }
  });

  it("the intent fetch target is the variant for the next reachable join, from every frame", () => {
    for (let abs = 0; abs < 2 * N; abs++) {
      const v = nextVariant(GLANCE, abs)!;
      const join = mod(v.entry - (abs + 4), N); // LEAD_FRAMES = 4
      expect(join).toBeLessThan(HERO_JOIN.step);
      expect(v.entry).toBe(mod(Math.ceil((abs + 4) / 36) * 36, N));
    }
  });
});

describe("S1a v2: plays only at its own entry (real queue -> resolveState -> decide)", () => {
  it("from every request frame of two cycles, it plays once, cutting in on its entry and never visible off it", () => {
    for (let at = 0; at < 2 * N; at++) {
      const log = simulate(at, 2 * N);
      assertOnlyOwnEntry(log);
      const on = log.filter((x) => isS1a(x.shown));
      // i0..i31 on screen; i32..i35 (exit window) equal the loop, so decide() shows the base there
      expect({ at, framesOn: on.length }).toEqual({ at, framesOn: 32 });
      // and it is the variant for the first join >= at + LEAD_FRAMES
      expect(entryOf(on[0].shown)).toBe(mod(Math.ceil((at + 4) / 36) * 36, N));
    }
  });

  it("with the nod rotation on (FEATURE_HERO_ROTATION_NOD), S1a still comes up only on its own entry", () => {
    let played = 0;
    for (let at = 0; at < 4 * N; at += 7) {
      const log = simulate(at, 2 * N, { rotation: heroRotation(true) });
      assertOnlyOwnEntry(log);
      if (log.some((x) => isS1a(x.shown))) played++;
    }
    expect(played).toBeGreaterThan(0);
  });
});

describe("S1a v2: mutation tests (a wrong-entry S1a is caught)", () => {
  it("M1 mis-keyed registry: every join -> s1a.k36; it only ever comes up at f36", () => {
    const wrong: QueueEnv = {
      reactions: {
        sip: {
          id: "sip",
          priority: 2,
          variants: Object.fromEntries(ENTRY_JOINS.map((k) => [k, S1A[36]])),
        },
      },
    };
    expect(entryKs(wrong.reactions!.sip!)).toEqual([36]);
    for (let at = 0; at < N; at += 3) {
      const log = simulate(at, 2 * N, { env: wrong, reactionId: "sip" });
      assertOnlyOwnEntry(log);
      const ups = log.filter(
        (x, i) => isS1a(x.shown) && (i === 0 || log[i - 1].shown !== x.shown),
      );
      expect(ups.map((x) => mod(x.abs, N))).toEqual([36]);
    }
  });

  it("M1b rotated registry (join k -> variant baked for k+36): nothing ever plays, the request is dropped", () => {
    const rotated: ReactionDef = {
      id: "sip",
      priority: 2,
      variants: Object.fromEntries(
        ENTRY_JOINS.map((k) => [k, S1A[mod(k + 36, N) as EntryJoin]]),
      ),
    };
    const env: QueueEnv = { reactions: { sip: rotated } };
    expect(entryKs(rotated)).toEqual([]);
    for (let at = 0; at < N; at += 5) {
      const log = simulate(at, 2 * N, { env, reactionId: "sip" });
      expect(log.filter((x) => x.shown !== "base")).toEqual([]);
    }
  });

  it("M2 a wrong-entry occurrence forced into the queue (playing or locked) is never on screen", () => {
    for (const k of ENTRY_JOINS)
      for (const j of ENTRY_JOINS) {
        if (j === k) continue;
        const occ: Occurrence = { action: S1A[k], cycle: 1, start: N + j };
        for (const q of [
          { ...initialQueue(), playing: { id: "glance-up" as const, occ } },
          {
            ...initialQueue(),
            slot: {
              id: "glance-up" as const,
              priority: 3,
              at: 0,
              occ,
              join: N + j,
              locked: true,
            },
          },
        ] satisfies QueueState[]) {
          let shown: Shown = "base";
          for (let abs = N + j - 2; abs < N + j + 40; abs++) {
            expect(occurrenceState(abs, occ)).toBeUndefined();
            const s = resolveState(stateAt(tOf(abs), []), q);
            shown = decide(s, shown, true).show;
            expect({ variant: S1A[k].id, at: j, shown }).toEqual({
              variant: S1A[k].id,
              at: j,
              shown: "base",
            });
          }
        }
      }
  });

  it("M3 a hand-built ScheduleState that bypasses occurrenceState: decide() refuses every foreign entry (control: own entry shows)", () => {
    const enterState = (
      a: ActionDef,
      start: number,
      abs: number,
    ): ScheduleState => ({
      abs,
      baseFrame: mod(abs, N),
      cycle: Math.floor(abs / N),
      action: {
        occurrence: { action: a, cycle: Math.floor(start / N), start },
        frame: abs - start,
        clipFrame: abs - start,
        phase: "enter",
      },
    });
    for (const k of ENTRY_JOINS) {
      const a = S1A[k];
      // Control: on its own entry the very same state shape shows the clip.
      const own = enterState(a, N + k, N + k);
      expect(onOwnEntry(own)).toBe(true);
      expect(decide(own, "base", true).show).toBe(a.id);
      expect(
        decide(
          { ...own, action: { ...own.action!, phase: "core" } },
          a.id,
          true,
        ).show,
      ).toBe(a.id);
      for (const j of ENTRY_JOINS) {
        if (j === k) continue;
        // (a) scheduled at a foreign join
        const bad = enterState(a, N + j, N + j);
        // Every other condition for showing holds (clip frame up, enter
        // phase, ready), so only the entry guard keeps it off screen.
        expect(bad.action!.clipFrame).toBe(0);
        expect(onOwnEntry(bad)).toBe(false);
        expect(decide(bad, "base", true).show).toBe("base");
        expect(
          decide(
            { ...bad, action: { ...bad.action!, phase: "core" } },
            a.id,
            true,
          ).show,
        ).toBe("base");
        // (b) correct start but a clock frame that is on a foreign join
        const skew: ScheduleState = { ...own, abs: N + j, baseFrame: j };
        expect(onOwnEntry(skew)).toBe(false);
        expect(decide(skew, "base", true).show).toBe("base");
      }
    }
  });

  it("M4 a mutated variant definition is rejected", () => {
    const a = S1A[36];
    // Art baked for f36 spliced at f72: fails validation, joinable nowhere.
    const shifted: ActionDef = { ...a, spliceOffset: 72 };
    expect(validateAction(shifted)).toContain(
      "s1a.k36: clip does not start on its entry join f36",
    );
    expect(joinableKs(shifted)).toEqual([]);
    // Relabelled entry (file and id still say k36): the id/file no longer match the entry.
    const relabelled: ActionDef = { ...a, entry: 72 };
    expect(relabelled.id).not.toBe(`s1a.k${relabelled.entry}`);
    expect(validateAction(relabelled)).toContain(
      "s1a.k36: clip does not start on its entry join f72",
    );
    // An enter window that reaches the next join is rejected.
    const wide: ActionDef = {
      ...a,
      enterWindow: [0, 36],
      exitWindow: [37, 40],
      frames: 41,
      clip: { ...a.clip, frames: 41 },
    };
    expect(validateAction(wide)).toContain(
      "s1a.k36: enter window reaches the foreign join f72",
    );
    // A queue registry carrying a mutated variant never shows it off f36.
    const env: QueueEnv = {
      reactions: { sip: { id: "sip", priority: 2, variants: { 72: shifted } } },
    };
    for (let at = 0; at < N; at += 9) {
      const log = simulate(at, 2 * N, { env, reactionId: "sip" });
      expect(log.filter((x) => x.shown !== "base")).toEqual([]);
    }
  });

  it("the rotation never auto-plays S1a (visitor reaction only)", () => {
    for (const r of [heroRotation(false), heroRotation(true)])
      expect(
        r.filter((id): id is ActionId => !!id && id.startsWith("s1a.")),
      ).toEqual([]);
  });
});
