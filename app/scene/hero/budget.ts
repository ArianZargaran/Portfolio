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
 * rotation 160 + MVP 330 = 746 -> 750 KiB). The locked install (typing,
 * nod.k180, the S1a and the T6 variants) has a worst case of 632,154 B AV1 /
 * 836,107 B H.264 (base + nod + the largest S1a + the largest T6 variant)
 * against these 768,000 / 993,280 B (check:media). A visit that hovers a
 * hotspot at several different joins fetches more than one variant; this
 * budget then refuses the fetch that would go over, and that reaction
 * doesn't play. A reaction clip is fetched only if the request would be
 * accepted (planReaction, review N1: nothing during the cooldown) and only
 * while the E2 egg nod still fits beside it (`canFetchKeeping(clip, [nod])`),
 * so repeated hovers can never starve the egg: base + nod + at most 3
 * hotspot variants per visit (any mix of S1a and T6) in either codec
 * (check:media's multi-hover case models exactly this). With the 30 s
 * same-reaction cooldown a third variant takes >= 30 s of hovering (glance,
 * groove, glance again); any further hotspot variant (e.g. a T6 after three
 * glances in >= 60 s) is then refused and only that reaction is skipped. A per-family
 * reserve (one variant of each hotspot reaction always affordable) was
 * measured at +110 B gzip of hero JS and is not in (docs/hero-player.md).
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
  /**
   * canFetch, while still leaving room for `reserve` (clips not fetched yet
   * that must stay affordable, e.g. the E2 egg nod while a glance fetches).
   */
  canFetchKeeping(clip: Clip, reserve: readonly Clip[]): boolean;
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
    canFetchKeeping: (clip, reserve) =>
      spent() +
        budget.cost(clip) +
        [...new Set(reserve)]
          .filter((r) => r !== clip)
          .reduce((n, r) => n + budget.cost(r), 0) <=
      limits[codec],
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
