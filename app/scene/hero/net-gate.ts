/**
 * Network and mobile gate for the hero motion (M7, PLAN v3.3 §7).
 *
 * Decides, once per page after the load event, whether the scene may play:
 *
 * 1. Save-Data on, or `prefers-reduced-data: reduce` (a bonus check; no
 *    stable browser supports it yet) -> "still".
 * 2. Battery API (Chromium only): under 20 % and not charging -> "still".
 * 3. Browsers that report a connection type (`navigator.connection`,
 *    Chromium): require `effectiveType === "4g"` -> "play", else "still".
 * 4. No connection API (Safari, Firefox): measure. Throughput is the bytes
 *    over the combined time span of the document, CSS, JS and the LCP still
 *    (one small image underestimates through TCP slow start, so this is a
 *    lower bound; a low reading errs toward the still). "play" needs
 *    >= 1.5 Mbps AND the composition's planned hero bytes within its
 *    budget; otherwise "still". The measured verdict is remembered for
 *    7 days.
 * 5. Inconclusive (the still or document came from cache: transferSize 0,
 *    encodedBodySize 0 or missing, or revalidated with a 304; no Resource
 *    Timing; or
 *    a cross-origin still without Timing-Allow-Origin): reuse the last measured verdict if it is at most
 *    7 days old; otherwise "frozen": the scene starts paused on the still
 *    (not persisted) and activating it plays (WCAG 2.2.2 controls).
 *
 * Pure: the browser reads live in `readGateEnv` / `measureThroughput`.
 */
import { BASE_LOOP } from "./actions";
import { VISIT_BUDGET_BYTES } from "./budget";

export type Verdict = "play" | "still" | "frozen";
export type Composition = "laptop" | "tablet" | "phone";

export const GATE = {
  minMbps: 1.5,
  verdictTtlMs: 7 * 24 * 3600 * 1000,
  lowBattery: 0.2,
  storageKey: "hero:net-verdict",
} as const;

/** Bytes per visit each composition may spend on hero media. */
export const COMPOSITION_BUDGET: Record<Composition, number> = {
  laptop: VISIT_BUDGET_BYTES.h264, // codec unknown before play: the larger
  tablet: 700_000, // PLAN §7: <= 0.7 MB (tablet close-up, pending Ari)
  phone: 400_000, // PLAN §7: <= 0.4 MB (phone close-up, pending Ari)
};

/**
 * Bytes a visit fetches before any intent: the typing loop at the larger
 * (H.264) size. Tablet/phone have no motion yet (close-ups pending Ari), so
 * they use the PLAN §7 estimates for their encodes.
 */
export const PLANNED_BYTES: Record<Composition, number> = {
  laptop: Math.max(...BASE_LOOP.clip.sources.map((s) => s.bytes)),
  tablet: Math.max(...BASE_LOOP.clip.sources.map((s) => s.bytes)),
  phone: 254_000, // 352x432 mobile typing encode, H.264 (PLAN §7)
};

export interface Throughput {
  bytes: number;
  ms: number;
}

export interface StoredVerdict {
  verdict: "play" | "still";
  at: number;
}

export interface GateEnv {
  composition: Composition;
  saveData?: boolean;
  reducedData?: boolean;
  /** Present only when the browser has the Network Information API. */
  connection?: { effectiveType?: string; saveData?: boolean };
  battery?: { level: number; charging: boolean };
  /** Undefined when the measurement is inconclusive. */
  throughput?: Throughput;
  stored?: StoredVerdict;
  now: number;
}

export interface GateResult {
  verdict: Verdict;
  /** Which rule decided (for docs, tests and the smoke page). */
  reason:
    | "save-data"
    | "battery"
    | "connection-4g"
    | "connection-slow"
    | "throughput-ok"
    | "throughput-slow"
    | "over-budget"
    | "stored"
    | "inconclusive";
  mbps?: number;
  /** A fresh measured verdict to remember. */
  store?: StoredVerdict;
}

export const mbpsOf = (t: Throughput): number => (t.bytes * 8) / t.ms / 1000;

export function decideGate(env: GateEnv): GateResult {
  if (env.saveData || env.connection?.saveData || env.reducedData)
    return { verdict: "still", reason: "save-data" };
  if (
    env.battery &&
    !env.battery.charging &&
    env.battery.level < GATE.lowBattery
  )
    return { verdict: "still", reason: "battery" };
  if (env.connection?.effectiveType)
    return env.connection.effectiveType === "4g"
      ? { verdict: "play", reason: "connection-4g" }
      : { verdict: "still", reason: "connection-slow" };
  if (env.throughput && env.throughput.bytes > 0 && env.throughput.ms > 0) {
    const mbps = mbpsOf(env.throughput);
    const overBudget =
      PLANNED_BYTES[env.composition] > COMPOSITION_BUDGET[env.composition];
    const verdict = mbps >= GATE.minMbps && !overBudget ? "play" : "still";
    return {
      verdict,
      reason:
        verdict === "play"
          ? "throughput-ok"
          : overBudget
            ? "over-budget"
            : "throughput-slow",
      mbps,
      store: { verdict, at: env.now },
    };
  }
  if (env.stored && env.now - env.stored.at <= GATE.verdictTtlMs)
    return { verdict: env.stored.verdict, reason: "stored" };
  return { verdict: "frozen", reason: "inconclusive" };
}

/** Minimal Resource Timing shape (PerformanceResourceTiming / Navigation). */
export interface TimingEntry {
  name: string;
  entryType: string;
  initiatorType?: string;
  startTime: number;
  responseEnd: number;
  transferSize?: number;
  encodedBodySize?: number;
}

/**
 * Downloaded over the network just now: the body came over the wire
 * (encodedBodySize > 0) and transferSize covers the headers plus that whole
 * body. Anything else says nothing about throughput and is left out (for the
 * document or the still: the measurement is inconclusive):
 *
 * - a cache hit reports transferSize 0;
 * - a revalidated 304 reports only the headers: transferSize < encodedBodySize
 *   (spec/Firefox shape), or Chromium's shape for a revalidated or
 *   memory-cached image: transferSize ~300 with encodedBodySize 0 (review
 *   lock-v5_2-clean, Medium 1: it read as ~5 kB of HTML over ~20 ms, a
 *   noise-driven verdict);
 * - missing sizes (no Timing-Allow-Origin, older Safari) report nothing.
 */
export const fresh = (e: TimingEntry): boolean => {
  const t = e.transferSize;
  const b = e.encodedBodySize;
  return t !== undefined && b !== undefined && b > 0 && t > 0 && t >= b;
};

const COUNTED = new Set(["navigation", "link", "css", "script", "img"]);

/**
 * Throughput over the document + CSS + JS + the still, or undefined if
 * inconclusive. `stillUrl` is the URL the <img> actually loaded
 * (currentSrc); its entry, and the document's, must be `fresh`.
 */
export function measureThroughput(
  entries: TimingEntry[],
  stillUrl: string | undefined,
): Throughput | undefined {
  if (!stillUrl) return undefined;
  const still = entries.find(
    (e) => e.entryType === "resource" && e.name === stillUrl,
  );
  const nav = entries.find((e) => e.entryType === "navigation");
  if (!still || !fresh(still) || !nav || !fresh(nav)) return undefined;
  const counted = entries.filter(
    (e) =>
      e === nav ||
      e === still ||
      (e.entryType === "resource" &&
        COUNTED.has(e.initiatorType ?? "") &&
        /\.(css|js|mjs)(\?|$)/.test(e.name) &&
        fresh(e)),
  );
  const bytes = counted.reduce((a, e) => a + (e.transferSize ?? 0), 0);
  const from = Math.min(...counted.map((e) => e.startTime));
  const to = Math.max(...counted.map((e) => e.responseEnd));
  const ms = to - from;
  return ms > 0 ? { bytes, ms } : undefined;
}

export function readStoredVerdict(
  storage: Pick<Storage, "getItem"> | undefined,
): StoredVerdict | undefined {
  try {
    const v = JSON.parse(
      storage?.getItem(GATE.storageKey) ?? "null",
    ) as StoredVerdict | null;
    return v &&
      (v.verdict === "play" || v.verdict === "still") &&
      Number.isFinite(v.at)
      ? v
      : undefined;
  } catch {
    return undefined;
  }
}

export function writeStoredVerdict(
  storage: Pick<Storage, "setItem"> | undefined,
  v: StoredVerdict,
): void {
  try {
    storage?.setItem(GATE.storageKey, JSON.stringify(v));
  } catch {
    /* storage unavailable: measure again next visit */
  }
}
