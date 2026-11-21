import { ACTIONS } from "./actions";
import {
  abandonedFetches,
  FETCH_LEAD_FRAMES,
  fetchDue,
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
