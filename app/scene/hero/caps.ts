/**
 * Hero byte numbers the always-loaded scene chunk needs (the network gate,
 * net-gate.ts), kept apart from the clip registry so that importing them
 * never pulls a clip URL or the registry into the first-paint path
 * (docs/hero-player.md, "Code split").
 */

export type Codec = "av1" | "h264";

/**
 * Per-visit hero media cap (PLAN v3.3 §4: 0.75 / 0.97 MB in the plan's KiB
 * arithmetic = 768,000 / 993,280 B). budget.ts enforces it per clip.
 */
export const VISIT_BUDGET_BYTES: Record<Codec, number> = {
  av1: 750 * 1024,
  h264: 970 * 1024,
};

/** Typing loop file sizes (media-files.test.ts keeps them equal to hero-media.build.json). */
export const TYPING_BYTES: Record<Codec, number> = {
  av1: 332_028,
  h264: 442_525,
};
