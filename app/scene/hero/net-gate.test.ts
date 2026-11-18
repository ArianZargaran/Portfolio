import {
  COMPOSITION_BUDGET,
  decideGate,
  GATE,
  measureThroughput,
  PLANNED_BYTES,
  readStoredVerdict,
  writeStoredVerdict,
  type GateEnv,
  type TimingEntry,
} from "./net-gate";

const now = 1_000_000_000_000;
const env = (e: Partial<GateEnv> = {}): GateEnv => ({
  composition: "laptop",
  now,
  ...e,
});
// 1.5 Mbps = 187.5 bytes per ms
const fast = { bytes: 600_000, ms: 1_000 }; // 4.8 Mbps
const slow = { bytes: 100_000, ms: 1_000 }; // 0.8 Mbps

describe("network gate (M7): decision per branch", () => {
  it("Save-Data, either source, or prefers-reduced-data -> still", () => {
    expect(decideGate(env({ saveData: true, throughput: fast }))).toMatchObject(
      {
        verdict: "still",
        reason: "save-data",
      },
    );
    expect(
      decideGate(env({ connection: { effectiveType: "4g", saveData: true } }))
        .verdict,
    ).toBe("still");
    expect(decideGate(env({ reducedData: true })).verdict).toBe("still");
  });

  it("low battery and not charging -> still (Chromium Battery API)", () => {
    const c = { effectiveType: "4g" };
    expect(
      decideGate(
        env({ connection: c, battery: { level: 0.15, charging: false } }),
      ).reason,
    ).toBe("battery");
    expect(
      decideGate(
        env({ connection: c, battery: { level: 0.15, charging: true } }),
      ).verdict,
    ).toBe("play");
  });

  it("a reported connection type must be 4g", () => {
    expect(
      decideGate(env({ connection: { effectiveType: "4g" } })),
    ).toMatchObject({ verdict: "play", reason: "connection-4g" });
    for (const t of ["3g", "2g", "slow-2g"])
      expect(
        decideGate(env({ connection: { effectiveType: t } })),
      ).toMatchObject({
        verdict: "still",
        reason: "connection-slow",
      });
    // the API decides even when a throughput reading exists
    expect(
      decideGate(env({ connection: { effectiveType: "3g" }, throughput: fast }))
        .verdict,
    ).toBe("still");
  });

  it("no connection API: >= 1.5 Mbps and within the byte budget plays, and is remembered", () => {
    const r = decideGate(env({ throughput: fast }));
    expect(r).toMatchObject({ verdict: "play", reason: "throughput-ok" });
    expect(r.mbps).toBeCloseTo(4.8);
    expect(r.store).toEqual({ verdict: "play", at: now });
    const s = decideGate(env({ throughput: slow }));
    expect(s).toMatchObject({ verdict: "still", reason: "throughput-slow" });
    expect(s.store?.verdict).toBe("still");
    expect(
      decideGate(env({ throughput: { bytes: 187_500, ms: 1_000 } })).verdict,
    ).toBe("play"); // exactly 1.5 Mbps
  });

  it("planned hero bytes fit every composition's budget", () => {
    for (const c of ["laptop", "tablet", "phone"] as const)
      expect(PLANNED_BYTES[c]).toBeLessThanOrEqual(COMPOSITION_BUDGET[c]);
    expect(COMPOSITION_BUDGET.phone).toBe(400_000);
    expect(COMPOSITION_BUDGET.tablet).toBe(700_000);
  });

  it("inconclusive: reuse a verdict up to 7 days old, else start frozen", () => {
    const fresh = { verdict: "play" as const, at: now - GATE.verdictTtlMs };
    expect(decideGate(env({ stored: fresh }))).toMatchObject({
      verdict: "play",
      reason: "stored",
    });
    const stale = { verdict: "play" as const, at: now - GATE.verdictTtlMs - 1 };
    expect(decideGate(env({ stored: stale }))).toMatchObject({
      verdict: "frozen",
      reason: "inconclusive",
    });
    expect(decideGate(env()).verdict).toBe("frozen");
    expect(decideGate(env({ throughput: { bytes: 0, ms: 10 } })).verdict).toBe(
      "frozen",
    );
  });
});

describe("network gate (M7): throughput measurement", () => {
  const nav: TimingEntry = {
    name: "https://ari.soy/",
    entryType: "navigation",
    startTime: 0,
    responseEnd: 200,
    transferSize: 20_000,
  };
  const css: TimingEntry = {
    name: "https://ari.soy/assets/root-1.css",
    entryType: "resource",
    initiatorType: "link",
    startTime: 210,
    responseEnd: 300,
    transferSize: 10_000,
  };
  const js: TimingEntry = {
    name: "https://ari.soy/assets/entry.client-1.js",
    entryType: "resource",
    initiatorType: "script",
    startTime: 210,
    responseEnd: 500,
    transferSize: 50_000,
  };
  const still: TimingEntry = {
    name: "https://ari.soy/assets/still-1440.avif",
    entryType: "resource",
    initiatorType: "img",
    startTime: 250,
    responseEnd: 1_000,
    transferSize: 120_000,
  };
  const font: TimingEntry = {
    name: "https://ari.soy/assets/x.woff2",
    entryType: "resource",
    initiatorType: "css",
    startTime: 0,
    responseEnd: 5_000,
    transferSize: 1,
  };

  it("sums document + CSS + JS + the still over their combined span", () => {
    expect(measureThroughput([nav, css, js, still, font], still.name)).toEqual({
      bytes: 200_000,
      ms: 1_000,
    });
  });

  it("is inconclusive when the still or document came from cache (transferSize 0)", () => {
    expect(
      measureThroughput([nav, { ...still, transferSize: 0 }], still.name),
    ).toBeUndefined();
    expect(
      measureThroughput([{ ...nav, transferSize: 0 }, still], still.name),
    ).toBeUndefined();
  });

  it("is inconclusive when the still was revalidated (304: headers only)", () => {
    // Found by the gate smoke test: a reload revalidated the still, which
    // reported ~300 B over a few ms and read as a "slow" network.
    const revalidated = {
      ...still,
      transferSize: 300,
      encodedBodySize: 119_700,
    };
    expect(measureThroughput([nav, revalidated], still.name)).toBeUndefined();
    // a 304'd script is left out of the sum instead of skewing it
    const js304 = { ...js, transferSize: 300, encodedBodySize: 49_700 };
    expect(measureThroughput([nav, js304, still], still.name)).toEqual({
      bytes: 140_000,
      ms: 1_000,
    });
  });

  it("is inconclusive without the still entry or URL (no Resource Timing, cross-origin)", () => {
    expect(measureThroughput([nav, css], still.name)).toBeUndefined();
    expect(measureThroughput([nav, still], undefined)).toBeUndefined();
  });
});

describe("network gate (M7): remembered verdict", () => {
  it("round-trips, and ignores junk", () => {
    const m = new Map<string, string>();
    const s = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
    };
    writeStoredVerdict(s, { verdict: "still", at: 5 });
    expect(readStoredVerdict(s)).toEqual({ verdict: "still", at: 5 });
    m.set(GATE.storageKey, "{nope");
    expect(readStoredVerdict(s)).toBeUndefined();
    m.set(GATE.storageKey, JSON.stringify({ verdict: "frozen", at: 1 }));
    expect(readStoredVerdict(s)).toBeUndefined();
    expect(readStoredVerdict(undefined)).toBeUndefined();
  });
});
