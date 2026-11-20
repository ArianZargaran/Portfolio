/**
 * Typed registry of the hero character's clips.
 *
 * The base loop (typing, LOCK_PAINTED_CHAR_TYPING_LOOP_V5_2, the B1 v5_2
 * home-pose loop) always runs on the shared clock. An action is a one-shot
 * that is spliced into it: action frame `i` stands in for base frame
 * `(spliceOffset + i) mod base.frames`. Near its ends an action is (within a
 * few levels) identical to the base loop, so the player may cut in anywhere
 * in `enterWindow` and back out anywhere in `exitWindow` without a visible
 * pop.
 *
 * Design A (PLAN v3.3 §2-3): every clip is a baked opaque crop that is clean
 * only at its own entry (the screen differs between joins: the v5_2 lock
 * review measured the full composite at f0-f144 vs f180 at up to 103 levels,
 * all of it screen + spill; the character layer is 0), so each entry k is its
 * own ActionDef with id `<family>.k<k>` and its own file
 * (`media/<family>.k<k>.<codec>.mp4`), and the player may cut it in ONLY at
 * `entry` (reactions.ts `joinableKs`, join-safety tests in reactions.test.ts).
 *
 * Installed: the typing loop and the E2 nod v4 (`nod.k180`) (Ari's lock
 * t1003s5480, option (a) via Atlas), and the S1a glance-up, one baked clip
 * per join `s1a.k0` .. `s1a.k180` (Ari's lock t1014s5523, "Lock just the
 * glance-up for poster hover", LOCK_PAINTED_CHAR_ACTION_S1A_GLANCE_UP_V2),
 * and the T6 speaker groove v3, one baked clip per join `t6.k0` .. `t6.k180`
 * (Ari's lock t1029s5606, "Lock the speaker groove v3",
 * LOCK_PAINTED_CHAR_ACTION_T6_SPEAKER_GROOVE_V3, speakers hover/focus).
 * The S1b / T2 per-entry clips are NOT locked and are not installed;
 * their clips, triggers and tests are kept on the local branch
 * `hero-reactions-s1a-s1b-t2` and come back when they lock. Bounce v2
 * (inside the v5_2 lock record) is locked as an asset only and does not ship.
 *
 * To add an action: render and prove it with scripts/hero/variants.py, copy
 * the passing encodes into media/, record them in hero-media.build.json and
 * CLIP_BYTES, and add its entries below.
 */

export type MediaType = "video/mp4" | "video/webm";

export interface ClipSource {
  src: string;
  type: MediaType;
  /** `codecs` parameter for canPlayType/<source type>, e.g. avc1.640020. */
  codecs: string;
  /** Codec family, for the per-visit byte budget (budget.ts). */
  codec: "av1" | "h264";
  /** File size in bytes (checked against hero-media.build.json in tests). */
  bytes: number;
}

export interface Clip {
  /** Ordered best-first; the browser plays the first it supports. */
  sources: ClipSource[];
  /** First action frame the encoded clip contains (clips can be trimmed). */
  firstFrame: number;
  /** Number of frames in the encoded clip. */
  frames: number;
}

export interface BaseLoopDef {
  id: "typing";
  frames: number;
  fps: number;
  clip: Clip;
}

/** The join points the per-entry variants exist for (join-config.ts). */
export const ENTRY_JOINS = [0, 36, 72, 108, 144, 180] as const;
export type EntryJoin = (typeof ENTRY_JOINS)[number];

/**
 * Action families: one per piece of art, one clip per entry within it.
 * Installed: the nod, S1a and T6 (S1b / T2 live on hero-reactions-s1a-s1b-t2
 * until they lock).
 */
export type ActionFamily = "nod" | "s1a" | "t6";
export type ActionId = "nod.k180" | `s1a.k${EntryJoin}` | `t6.k${EntryJoin}`;

export interface ActionDef {
  id: ActionId;
  family: ActionFamily;
  /** Base frame the clip is baked for (its only clean entry). */
  entry: EntryJoin;
  label: string;
  /** Length of the action in frames (the render). */
  frames: number;
  fps: number;
  /** Action frame i maps to base frame (spliceOffset + i) mod base.frames. */
  spliceOffset: number;
  /** Inclusive action-frame range where the action equals the base loop at its start. */
  enterWindow: [number, number];
  /** Inclusive action-frame range where the action equals the base loop at its end. */
  exitWindow: [number, number];
  clip: Clip;
  /** Art record the frames come from (for traceability). */
  lock: string;
}

/* Imported, not served from public/: Vite content-hashes each file into
   build/client/assets/<name>-<hash>.mp4, which is cached immutably (1 year)
   by react-router-serve and by the /assets/* header in vercel.json. Build
   metadata (sources, encoder settings, hashes) lives in
   scripts/hero/hero-media.build.json, which is never served. */
const MEDIA = import.meta.glob<string>("./media/*.mp4", {
  eager: true,
  import: "default",
});
const urlOf = (file: string): string => {
  const url = MEDIA[`./media/${file}`];
  if (!url) throw new Error(`hero media missing: ${file}`);
  return url;
};

/* File sizes, so the per-visit budget can be checked before a fetch
   (media-files.test.ts keeps them equal to hero-media.build.json). */
export const CLIP_BYTES: Record<
  "typing" | ActionId,
  { av1: number; h264: number }
> = {
  typing: { av1: 332_028, h264: 442_525 },
  "nod.k180": { av1: 115_975, h264: 147_578 },
  "s1a.k0": { av1: 88_436, h264: 117_692 },
  "s1a.k36": { av1: 89_515, h264: 119_543 },
  "s1a.k72": { av1: 90_003, h264: 117_895 },
  "s1a.k108": { av1: 89_135, h264: 117_884 },
  "s1a.k144": { av1: 89_636, h264: 117_960 },
  "s1a.k180": { av1: 90_507, h264: 117_129 },
  "t6.k0": { av1: 92_261, h264: 124_967 },
  "t6.k36": { av1: 92_241, h264: 126_461 },
  "t6.k72": { av1: 93_644, h264: 125_979 },
  "t6.k108": { av1: 92_401, h264: 126_160 },
  "t6.k144": { av1: 92_761, h264: 125_867 },
  "t6.k180": { av1: 93_327, h264: 125_541 },
};

/* AV1 first (about 25% smaller at the same quality; Chrome, Edge, Firefox,
   Safari on AV1 hardware), H.264 High as the universal fallback. Both are
   opaque crops of the full composite (see docs/hero-encoding.md). */
const sources = (name: keyof typeof CLIP_BYTES): ClipSource[] => [
  {
    src: urlOf(`${name}.av1.mp4`),
    type: "video/mp4",
    codecs: "av01.0.01M.08",
    codec: "av1",
    bytes: CLIP_BYTES[name].av1,
  },
  {
    src: urlOf(`${name}.h264.mp4`),
    type: "video/mp4",
    codecs: "avc1.640020",
    codec: "h264",
    bytes: CLIP_BYTES[name].h264,
  },
];

export const BASE_LOOP: BaseLoopDef = {
  id: "typing",
  frames: 216,
  fps: 12,
  clip: { sources: sources("typing"), firstFrame: 0, frames: 216 },
};

/* Lock records the installed clips come from (Ari, cards t1003s5480,
   t1014s5523 and t1029s5606; verified against portfolio-brain
   tools/locks_now29.sha and tools/locks_now30.sha by
   scripts/hero/verify_locks.py, see docs/hero-player.md).
   THE single source of truth for these ids and shas: join-config.ts derives
   V5_2_LOCK_RECORD / V5_2_LOCK_SHA256 from LOCK_RECORDS.typing, and
   media-files.test.ts checks hero-media.build.json's `locks` block against it. */
export const LOCK_RECORDS = {
  typing: {
    record: "LOCK_PAINTED_CHAR_TYPING_LOOP_V5_2",
    sha256: "14563ba506716c358c08cec7e81799844084833088ac7e0fd1c2a5f085b5b712",
  },
  nod: {
    record: "LOCK_PAINTED_CHAR_ACTION_E2_NOD_V4",
    sha256: "08dcd66c76b505ae386532870beabbae7ace72b27c576a88cf7e53a5375727dc",
  },
  s1a: {
    record: "LOCK_PAINTED_CHAR_ACTION_S1A_GLANCE_UP_V2",
    sha256: "6de9b1acea9264c7f62a4c5d46f72c00bd2af177b9b646b0a9a151b185538027",
  },
  t6: {
    record: "LOCK_PAINTED_CHAR_ACTION_T6_SPEAKER_GROOVE_V3",
    sha256: "129bda2dd2c58afb35151b6a04dba9ac96ed56ed6d280afc0456dbf1673fa709",
  },
} as const;

const lockString = (l: { record: string; sha256: string }) =>
  `${l.record} (sha256 ${l.sha256})`;

/**
 * A per-entry variant: 36 frames, clip frame i over base frame k + i,
 * returning on the join k + 36. Windows measured against the v5_2 loop with
 * the splice-proof rule (p99.9 <= 4, 0 px > 8): the first `enterFrames`
 * frames equal the loop at the start (all of them on the entry join k or
 * the frames right after it, so the ONLY join it cuts in on is k itself),
 * and the last `exitFrames` frames at the end. S1a: 1 / 4
 * ($HERO_REPORT/pipeline/m9b-dryrun-v5_2/identity_windows.json); T6: 2 / 3
 * (docs/hero-player.md, measured on the locked v3 frames).
 */
const variant = (
  family: "s1a" | "t6",
  k: EntryJoin,
  label: string,
  exitFrames: number,
  lock: string,
  enterFrames: number,
): ActionDef => {
  const id = `${family}.k${k}` as ActionId;
  return {
    id,
    family,
    entry: k,
    label: `${label} (entry f${k})`,
    frames: 36,
    fps: 12,
    spliceOffset: k,
    enterWindow: [0, enterFrames - 1],
    exitWindow: [36 - exitFrames, 35],
    clip: { sources: sources(id), firstFrame: 0, frames: 36 },
    lock,
  };
};

const entries = (
  family: "s1a" | "t6",
  label: string,
  exitFrames: number,
  lock: string,
  enterFrames = 1,
): Record<string, ActionDef> =>
  Object.fromEntries(
    ENTRY_JOINS.map((k) => {
      const a = variant(family, k, label, exitFrames, lock, enterFrames);
      return [a.id, a];
    }),
  );

export const ACTIONS = {
  /* E2 nod v4: the locked E2 v3 head on the v5_2 hands. The clip is the
     home-pose sub-clip i60-131: i60 is the home pose (lands on f180), i131 is
     loop f35, back on the f36 join. Its spill on the character is lit by
     f180's screen, so it is clean only when entered at f180 (nod v4 README,
     REVIEW t995 B1 §2). Encoded at AV1 crf 32 / H.264 crf 21 to fit the cap. */
  "nod.k180": {
    id: "nod.k180",
    family: "nod",
    entry: 180,
    label: "Music nod (E2 v4)",
    frames: 168,
    fps: 12,
    spliceOffset: 120,
    enterWindow: [0, 61],
    exitWindow: [109, 167],
    clip: { sources: sources("nod.k180"), firstFrame: 60, frames: 72 },
    lock: lockString(LOCK_RECORDS.nod),
  },
  /* S1a glance-up v2 (queen-poster hover/focus, reactions.ts "glance-up"):
     one baked opaque crop per join, screen included. Each is clean ONLY at
     its own entry (lock review locks_now29 §3 note B: at a foreign entry
     the crop differs by 69-15,688 px > 8 on the screen and spill), so it may
     cut in only at f`entry` (validateAction, joinableKs, step, and the
     occurrenceState / decide guards in schedule.ts). */
  ...entries("s1a", "Glance up (S1a v2)", 4, lockString(LOCK_RECORDS.s1a)),
  /* T6 speaker groove v3 (speakers hover/focus, reactions.ts "speaker"):
     one baked opaque crop per join, screen included (H000 also carries the
     Harvey-to-code screen fade). Clean ONLY at its own entry (lock review
     locks_now30 §3: 69-15,688 px > 8 at a foreign entry), returning to the
     loop at f(k+36). i0-i1 equal the loop at fk/fk+1 and i33-i35 equal it
     at f(k+33)-f(k+35), so enter [0,1], exit [33,35]. */
  ...entries("t6", "Speaker groove (T6 v3)", 3, lockString(LOCK_RECORDS.t6), 2),
} as Record<ActionId, ActionDef>;

/** The nod (E2 egg, optional rotation slot). */
export const NOD = ACTIONS["nod.k180"];

/** Per-entry variants of one family, keyed by their entry join. */
export const familyVariants = (
  family: ActionFamily,
): Partial<Record<EntryJoin, ActionDef>> =>
  Object.fromEntries(
    Object.values(ACTIONS)
      .filter((a) => a.family === family)
      .map((a) => [a.entry, a]),
  );

/** Frames where the cut may actually happen: splice window ∩ encoded clip. */
export function cutWindows(a: ActionDef): {
  enter: [number, number];
  exit: [number, number];
} {
  const clipEnd = a.clip.firstFrame + a.clip.frames - 1;
  return {
    enter: [
      Math.max(a.enterWindow[0], a.clip.firstFrame),
      Math.min(a.enterWindow[1], clipEnd),
    ],
    exit: [
      Math.max(a.exitWindow[0], a.clip.firstFrame),
      Math.min(a.exitWindow[1], clipEnd),
    ],
  };
}

/** Static checks every registry entry must pass (run in tests). */
export function validateAction(a: ActionDef, base = BASE_LOOP): string[] {
  const errs: string[] = [];
  const { enter, exit } = cutWindows(a);
  if (a.fps !== base.fps)
    errs.push(`${a.id}: fps ${a.fps} != base ${base.fps}`);
  if (a.spliceOffset < 0 || a.spliceOffset >= base.frames)
    errs.push(`${a.id}: spliceOffset out of range`);
  if (enter[0] > enter[1])
    errs.push(`${a.id}: clip does not cover the enter window`);
  if (exit[0] > exit[1])
    errs.push(`${a.id}: clip does not cover the exit window`);
  if (a.enterWindow[1] >= a.exitWindow[0])
    errs.push(`${a.id}: enter window overlaps exit window`);
  if (a.exitWindow[1] >= a.frames)
    errs.push(`${a.id}: exit window past the end`);
  if (a.clip.firstFrame + a.clip.frames > a.frames)
    errs.push(`${a.id}: clip longer than the action`);
  // Join safety (design A, lock review locks_now28 §4): the clip must come up
  // on its own entry join, and no frame it may cut in on may sit on another
  // join, where the baked screen differs from the loop's.
  const mod = (n: number) => ((n % base.frames) + base.frames) % base.frames;
  if (mod(a.spliceOffset + a.clip.firstFrame) !== a.entry)
    errs.push(`${a.id}: clip does not start on its entry join f${a.entry}`);
  for (let i = enter[0]; i <= enter[1]; i++) {
    const k = mod(a.spliceOffset + i);
    if (k !== a.entry && (ENTRY_JOINS as readonly number[]).includes(k))
      errs.push(`${a.id}: enter window reaches the foreign join f${k}`);
  }
  return errs;
}
