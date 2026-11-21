/**
 * The base typing loop (LOCK_PAINTED_CHAR_TYPING_LOOP_V5_2) and the clip
 * types, without the reaction registry. The loop player chunk
 * (hero-player.tsx) imports only this; the action clips (actions.ts) are
 * imported by the lazy reactions chunk (hero-reactions.ts), so their URLs
 * and lock records never ship on the critical path.
 */
import { TYPING_BYTES, type Codec } from "./caps";
import typingAv1 from "./media/typing.av1.mp4";
import typingH264 from "./media/typing.h264.mp4";


export type MediaType = "video/mp4" | "video/webm";

export interface ClipSource {
  src: string;
  type: MediaType;
  /** `codecs` parameter for canPlayType, e.g. avc1.640020. */
  codecs: string;
  /** Codec family, for the per-visit byte budget (budget.ts). */
  codec: Codec;
  /** File size in bytes (checked against hero-media.build.json in tests). */
  bytes: number;
}

export interface Clip {
  /** Ordered best-first; the player fetches the first the browser can play. */
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

/* AV1 first (about 25% smaller at the same quality; Chrome, Edge, Firefox,
   Safari on AV1 hardware), H.264 High as the universal fallback. Both are
   opaque crops of the full composite (see docs/hero-encoding.md). */
export const clipSources = (
  av1: string,
  h264: string,
  bytes: Record<Codec, number>,
): ClipSource[] => [
  {
    src: av1,
    type: "video/mp4",
    codecs: "av01.0.01M.08",
    codec: "av1",
    bytes: bytes.av1,
  },
  {
    src: h264,
    type: "video/mp4",
    codecs: "avc1.640020",
    codec: "h264",
    bytes: bytes.h264,
  },
];

export const BASE_LOOP: BaseLoopDef = {
  id: "typing",
  frames: 216,
  fps: 12,
  clip: {
    sources: clipSources(typingAv1, typingH264, TYPING_BYTES),
    firstFrame: 0,
    frames: 216,
  },
};
