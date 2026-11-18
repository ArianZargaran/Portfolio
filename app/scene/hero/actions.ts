/**
 * Typed registry of the hero character's clips.
 *
 * The base loop (typing, LOCK_PAINTED_CHAR_TYPING_LOOP_V5_1) always runs on
 * the shared clock. An action is a one-shot that is spliced into it: action
 * frame `i` stands in for base frame `(spliceOffset + i) mod base.frames`.
 * Near its ends an action is (within a few levels) identical to the base
 * loop, so the player may cut in anywhere in `enterWindow` and back out
 * anywhere in `exitWindow` without a visible pop. That slack is what lets
 * a <video> start a frame or two late without anyone seeing it.
 *
 * To add an action: render its frames against the locked loop, encode a clip
 * (scripts/hero/encode.md), and add one entry to ACTIONS plus, if it should
 * play by itself, a slot in HERO_ROTATION (schedule.ts).
 */

import bounceAv1 from "./media/bounce.av1.mp4";
import bounceH264 from "./media/bounce.h264.mp4";
import nodAv1 from "./media/nod.av1.mp4";
import nodH264 from "./media/nod.h264.mp4";
import typingAv1 from "./media/typing.av1.mp4";
import typingH264 from "./media/typing.h264.mp4";
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

export type ActionId = "nod" | "bounce";

export interface ActionDef {
  id: ActionId;
  label: string;
  /** Length of the action in frames (the locked render). */
  frames: number;
  fps: number;
  /** Action frame i maps to base frame (spliceOffset + i) mod base.frames. */
  spliceOffset: number;
  /** Inclusive action-frame range where the action equals the base loop at its start. */
  enterWindow: [number, number];
  /** Inclusive action-frame range where the action equals the base loop at its end. */
  exitWindow: [number, number];
  clip: Clip;
  /** Lock record the frames come from (for traceability). */
  lock: string;
}

/* Imported, not served from public/: Vite content-hashes each file into
   build/client/assets/<name>-<hash>.mp4, which is cached immutably (1 year)
   by react-router-serve and by the /assets/* header in vercel.json. Build
   metadata (sources, encoder settings, hashes) lives in
   scripts/hero/hero-media.build.json, which is never served. */
const CLIP_URLS = {
  typing: { av1: typingAv1, h264: typingH264 },
  nod: { av1: nodAv1, h264: nodH264 },
  bounce: { av1: bounceAv1, h264: bounceH264 },
} as const;

/* File sizes, so the per-visit budget can be checked before a fetch
   (media-files.test.ts keeps them equal to hero-media.build.json). */
const CLIP_BYTES = {
  typing: { av1: 333_271, h264: 445_269 },
  nod: { av1: 164_081, h264: 217_147 },
  bounce: { av1: 92_800, h264: 115_915 },
} as const;

/* AV1 first (about 25% smaller at the same quality; Chrome, Edge, Firefox,
   Safari on AV1 hardware), H.264 High as the universal fallback. Both are
   opaque crops of the full composite (see docs/hero-encoding.md). */
const sources = (name: keyof typeof CLIP_URLS): ClipSource[] => [
  {
    src: CLIP_URLS[name].av1,
    type: "video/mp4",
    codecs: "av01.0.01M.08",
    codec: "av1",
    bytes: CLIP_BYTES[name].av1,
  },
  {
    src: CLIP_URLS[name].h264,
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

export const ACTIONS: Record<ActionId, ActionDef> = {
  /* E2 v3 calm groove nod. Locked 2026-11-15 15:14 CT. Active (differs from
     the loop) only in f61-109; frames 0-60 and 110-167 match loop frame
     (120 + i) mod 216 within 4 levels. The clip keeps f48-121: one second
     of identical frames on each side to cut in and out. */
  nod: {
    id: "nod",
    label: "Music nod (E2 v3)",
    frames: 168,
    fps: 12,
    spliceOffset: 120,
    enterWindow: [0, 60],
    exitWindow: [110, 167],
    clip: { sources: sources("nod"), firstFrame: 48, frames: 74 },
    lock: "LOCK_PAINTED_CHAR_ACTION_E2_NOD_V3",
  },
  /* Left-leg bounce track of the v5_1 loop: byte-identical to typing except
     f84-107. The clip keeps f72-119. */
  bounce: {
    id: "bounce",
    label: "Left-leg bounce (t959 v5_1)",
    frames: 216,
    fps: 12,
    spliceOffset: 0,
    enterWindow: [0, 83],
    exitWindow: [108, 215],
    clip: { sources: sources("bounce"), firstFrame: 72, frames: 48 },
    lock: "LOCK_PAINTED_CHAR_TYPING_LOOP_V5_1 (bounce track)",
  },
};

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
  return errs;
}
