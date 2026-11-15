/**
 * The scene's single shared clock (motion.spec.yaml, independent_layers.runtime):
 * one `t` in seconds since load; every layer derives its phase from it,
 * `phase = (t mod period) / period`. Pausing (tab hidden) stops `t`.
 * No layer keeps its own timer.
 */

/** Positive modulo (JS `%` keeps the sign of the dividend). */
export const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** Phase in [0, 1) of a layer with the given period. */
export const phase = (t: number, periodS: number): number =>
  mod(t, periodS) / periodS;

/** Cloud band: independent 72 s layer (scene.spec motion, 3 x 24 s). */
export const CLOUD_PERIOD_S = 72;
/** Spec master loop. The locked character loop is 18 s; see docs/hero-encoding.md. */
export const SPEC_MASTER_PERIOD_S = 24;

export interface SceneClock {
  /** Seconds since start, excluding paused time. */
  now(): number;
  pause(): void;
  resume(): void;
  readonly paused: boolean;
}

/**
 * Clock over a monotonic millisecond source (performance.now in the browser;
 * injectable for tests).
 */
export function createClock(
  source: () => number = () => performance.now(),
): SceneClock {
  const start = source();
  let pausedAt: number | null = null;
  let pausedTotal = 0;
  return {
    now() {
      const at = pausedAt ?? source();
      return (at - start - pausedTotal) / 1000;
    },
    pause() {
      if (pausedAt === null) pausedAt = source();
    },
    resume() {
      if (pausedAt !== null) {
        pausedTotal += source() - pausedAt;
        pausedAt = null;
      }
    },
    get paused() {
      return pausedAt !== null;
    },
  };
}
