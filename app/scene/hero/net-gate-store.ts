/**
 * Browser side of the network gate (net-gate.ts): reads the environment
 * once after the load event, decides, remembers a measured verdict, and
 * shares the result with the scene (freeze UI) and the hero mount.
 */
import {
  decideGate,
  measureThroughput,
  readStoredVerdict,
  writeStoredVerdict,
  type Composition,
  type GateEnv,
  type GateResult,
  type TimingEntry,
} from "./net-gate";

type Nav = Navigator & {
  connection?: { effectiveType?: string; saveData?: boolean };
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
};

const storage = (win: Window) => {
  try {
    return win.localStorage;
  } catch {
    return undefined;
  }
};

export function compositionOf(win: Window): Composition {
  if (win.matchMedia("(min-width: 1025px)").matches) return "laptop";
  if (win.matchMedia("(min-width: 601px)").matches) return "tablet";
  return "phone";
}

/** The URL the scene still actually loaded (srcset/picture resolved). */
const stillUrl = (doc: Document) =>
  doc.querySelector<HTMLImageElement>(".scene-still_img")?.currentSrc ||
  undefined;

export async function readGateEnv(win: Window = window): Promise<GateEnv> {
  const nav = win.navigator as Nav;
  let battery: GateEnv["battery"];
  try {
    const b = await nav.getBattery?.();
    if (b) battery = { level: b.level, charging: b.charging };
  } catch {
    battery = undefined;
  }
  const perf = win.performance;
  const entries = (perf?.getEntries?.() ?? []) as unknown as TimingEntry[];
  return {
    composition: compositionOf(win),
    reducedData: win.matchMedia("(prefers-reduced-data: reduce)").matches,
    connection: nav.connection
      ? {
          effectiveType: nav.connection.effectiveType,
          saveData: nav.connection.saveData,
        }
      : undefined,
    battery,
    throughput: measureThroughput(entries, stillUrl(win.document)),
    stored: readStoredVerdict(storage(win)),
    now: Date.now(),
  };
}

let result: GateResult | undefined;
let pending: Promise<GateResult> | undefined;
const listeners = new Set<() => void>();

export const heroGate = (): GateResult | undefined => result;

export function subscribeHeroGate(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Runs the gate once per page (idempotent); call after the load event. */
export function evaluateHeroGate(win: Window = window): Promise<GateResult> {
  pending ??= readGateEnv(win).then((env) => {
    const r = decideGate(env);
    if (r.store) writeStoredVerdict(storage(win), r.store);
    result = r;
    win.document.documentElement.dataset.heroGate = `${r.verdict}:${r.reason}`;
    listeners.forEach((l) => l());
    return r;
  });
  return pending;
}

/** Tests only. */
export function resetHeroGateForTests(): void {
  result = undefined;
  pending = undefined;
  listeners.clear();
}
