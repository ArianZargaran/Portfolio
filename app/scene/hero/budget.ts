/**
 * Per-visit byte budget for hero media (PLAN v3.3 §4, decided: fetch on
 * hover/focus intent only, no idle prefetch, budget kept at 0.75 / 0.97 MB).
 *
 * The budget covers every hero clip a visit downloads: the typing loop, the
 * auto-rotation's clips and any reaction or egg clip. Sizes come from the
 * registry (ClipSource.bytes), so a fetch is checked before it starts. The
 * codec is whichever source the browser picked for the typing loop (AV1 or
 * the H.264 fallback, e.g. Safari without AV1 hardware). Until that is
 * known, the larger H.264 sizes are charged against the H.264 budget.
 * Once a clip would exceed the budget it is not fetched, and a reaction
 * that needs it does not play (the still and the loop carry on).
 *
 * "MB" here follows the plan's KiB arithmetic (576 KiB at M3 - nod in
 * rotation 160 + MVP 330 = 746 -> 750 KiB). The locked v5_2 install
 * (typing + nod.k180 only) has a worst case of 448,003 B AV1 / 590,103 B
 * H.264 against these 768,000 / 993,280 B (check:media).
 */
import type { Clip, ClipSource } from "./actions";

export type Codec = ClipSource["codec"];

export const VISIT_BUDGET_BYTES: Record<Codec, number> = {
  av1: 750 * 1024,
  h264: 970 * 1024,
};

export interface Budget {
  readonly codec: Codec;
  readonly spent: number;
  /** Bytes this clip would cost in the current codec (0 if already fetched). */
  cost(clip: Clip): number;
  canFetch(clip: Clip): boolean;
  /** Records the clip as fetched. Returns false (and records nothing) if over. */
  charge(clip: Clip): boolean;
  /** Called once the browser has picked a source for the base loop. */
  setCodec(codec: Codec): void;
}

const sizeFor = (clip: Clip, codec: Codec) =>
  clip.sources.find((s) => s.codec === codec)?.bytes ??
  Math.max(...clip.sources.map((s) => s.bytes));

export function createBudget(
  limits: Record<Codec, number> = VISIT_BUDGET_BYTES,
): Budget {
  let codec: Codec = "h264";
  const fetched = new Set<Clip>();
  const spent = () => [...fetched].reduce((a, c) => a + sizeFor(c, codec), 0);
  const budget: Budget = {
    get codec() {
      return codec;
    },
    get spent() {
      return spent();
    },
    cost: (clip) => (fetched.has(clip) ? 0 : sizeFor(clip, codec)),
    canFetch: (clip) => spent() + budget.cost(clip) <= limits[codec],
    charge(clip) {
      if (!budget.canFetch(clip)) return false;
      fetched.add(clip);
      return true;
    },
    setCodec(next) {
      codec = next;
    },
  };
  return budget;
}

/** Codec of the source a <video> is actually playing, from currentSrc. */
export function codecOfCurrentSrc(clip: Clip, currentSrc: string): Codec {
  const s = clip.sources.find((x) => currentSrc.endsWith(x.src));
  return s?.codec ?? "h264";
}
