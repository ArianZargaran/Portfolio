/**
 * Test-only per-entry clips (never imported by app code, so never bundled).
 * Same shape as the t995 per-entry variants that wait on
 * hero-reactions-s1a-s1b-t2 (36 frames, baked for join k, clean only at k),
 * so the queue, schedule, warm and budget machinery keeps its coverage while
 * no such clip is installed.
 */
import {
  ACTIONS,
  ENTRY_JOINS,
  NOD,
  type ActionDef,
  type ActionFamily,
  type ActionId,
  type EntryJoin,
} from "../actions";

export const fixtureVariant = (
  k: EntryJoin,
  family = "fx",
  bytes = { av1: 90_000, h264: 120_000 },
): ActionDef => ({
  id: `${family}.k${k}` as ActionId,
  family: family as ActionFamily,
  entry: k,
  label: `Fixture ${family} (entry f${k})`,
  frames: 36,
  fps: 12,
  spliceOffset: k,
  enterWindow: [0, 0],
  exitWindow: [32, 35],
  clip: {
    sources: NOD.clip.sources.map((s) => ({
      ...s,
      src: `${s.src}#${family}.k${k}`,
      bytes: bytes[s.codec],
    })),
    firstFrame: 0,
    frames: 36,
  },
  lock: "test fixture",
});

/** Join k -> fixture clip baked for k, for every join (as S1a/S1b ship). */
export const fixtureFamily = (
  family = "fx",
): Partial<Record<number, ActionDef>> =>
  Object.fromEntries(ENTRY_JOINS.map((k) => [k, fixtureVariant(k, family)]));

/** The installed registry plus fixture clips, for schedule/stateAt tests. */
export const withFixtures = (
  ...extra: ActionDef[]
): Record<ActionId, ActionDef> =>
  ({
    ...ACTIONS,
    ...Object.fromEntries(extra.map((a) => [a.id, a])),
  }) as Record<ActionId, ActionDef>;
