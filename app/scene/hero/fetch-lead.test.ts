import { ACTIONS } from "./actions";
import {
  abandonedFetches,
  FETCH_LEAD_FRAMES,
  FETCH_LEAD_MAX_FRAMES,
  fetchDue,
  fetchLeadFrames,
  initialQueue,
  LEAD_FRAMES,
  request,
  step,
} from "./reactions";

const N = 216;
const tOf = (abs: number) => abs / 12;

describe("change 3: deferred reaction fetch and abandoned fetches", () => {
  it("the fetch lead is longer than the lock lead, and 1.5 s", () => {
    expect(FETCH_LEAD_FRAMES).toBe(18);
    expect(FETCH_LEAD_FRAMES).toBeGreaterThan(LEAD_FRAMES);
  });

  it("fetchDue: true only within FETCH_LEAD_FRAMES of the clip's first frame", () => {
    const occ = { action: ACTIONS["s1a.k72"], cycle: 0, start: 72 };
    expect(fetchDue(occ, 72 - 19)).toBe(false);
    expect(fetchDue(occ, 72 - 18)).toBe(true);
    expect(fetchDue(occ, 72)).toBe(true);
  });

  it("poster then headphones: the replaced glance is abandoned, the groove kept", () => {
    let q = step(
      request(initialQueue(), "glance-up", tOf(40)).state,
      tOf(40),
      40,
    );
    expect(q.slot?.occ?.action.id).toBe("s1a.k72");
    const r = request(q, "speaker", tOf(42));
    expect(r.accepted).toBe(true);
    q = step(r.state, tOf(42), 42);
    expect(q.slot?.occ?.action.id).toBe("t6.k72");
    expect(abandonedFetches(q, ["s1a.k72", "t6.k72"])).toEqual(["s1a.k72"]);
  });

  it("inside the lock window the glance is kept (no groove) and nothing is abandoned", () => {
    let q = step(
      request(initialQueue(), "glance-up", tOf(40)).state,
      tOf(40),
      40,
    );
    q = step(q, tOf(68), 68); // J-4: locked
    const r = request(q, "speaker", tOf(69));
    expect(r.accepted).toBe(false);
    expect(abandonedFetches(r.state, ["s1a.k72"])).toEqual([]);
  });

  it("the playing reaction's clip is never abandoned", () => {
    let q = step(
      request(initialQueue(), "glance-up", tOf(40)).state,
      tOf(40),
      40,
    );
    q = step(q, tOf(72), 72);
    expect(q.playing?.occ.action.id).toBe("s1a.k72");
    expect(abandonedFetches(q, ["s1a.k72"])).toEqual([]);
    expect(N).toBe(216);
  });
});

describe("review N1: adaptive fetch lead from the measured link", () => {
  const T6_H264 = 126_461;
  it("unknown or instant link: the 18-frame minimum (change 3 unchanged)", () => {
    expect(fetchLeadFrames(T6_H264, undefined)).toBe(FETCH_LEAD_FRAMES);
    expect(fetchLeadFrames(T6_H264, { bps: Infinity, ttfbMs: 0 })).toBe(18);
    expect(fetchLeadFrames(T6_H264, { bps: 0, ttfbMs: 0 })).toBe(18);
    expect(fetchLeadFrames(T6_H264, { bps: 50e6, ttfbMs: 20 })).toBe(18);
  });

  it("700 kbps / 270 ms: (1.445 s x 1.5 + 0.27 s) x 12 + 4 = 34 frames", () => {
    expect(fetchLeadFrames(T6_H264, { bps: 700_000, ttfbMs: 270 })).toBe(34);
  });

  it("1.5 Mbps / 150 ms: the 18-frame minimum; 1.0 Mbps: 25", () => {
    expect(fetchLeadFrames(T6_H264, { bps: 1_500_000, ttfbMs: 150 })).toBe(18);
    expect(fetchLeadFrames(T6_H264, { bps: 1_000_000, ttfbMs: 150 })).toBe(25);
  });

  it("very slow links are capped at two join intervals (fetch at intent)", () => {
    expect(FETCH_LEAD_MAX_FRAMES).toBe(72);
    expect(fetchLeadFrames(T6_H264, { bps: 100_000, ttfbMs: 800 })).toBe(72);
  });

  it("the lead always lets the download finish (at the measured rate) LEAD_FRAMES before the join", () => {
    for (const bps of [400e3, 700e3, 1e6, 1.5e6, 3e6])
      for (const ttfbMs of [50, 150, 270, 500]) {
        const lead = fetchLeadFrames(T6_H264, { bps, ttfbMs });
        const needed = ((T6_H264 * 8) / bps + ttfbMs / 1000) * 12;
        expect(lead === 72 || lead - LEAD_FRAMES >= needed).toBe(true);
      }
  });
});
