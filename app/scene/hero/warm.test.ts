import { ACTIONS } from "./actions";
import type { Occurrence } from "./schedule";
import { WARM_FRAMES, WARM_MAX_ACTIONS, warmTargets } from "./warm";

const occ = (a: keyof typeof ACTIONS, clipAt: number): Occurrence => ({
  action: ACTIONS[a],
  cycle: 0,
  start: clipAt - ACTIONS[a].clip.firstFrame,
});

describe("warm hidden videos (M6)", () => {
  it("warms a clip at most 1 s ahead of its first frame, not after it starts", () => {
    expect(WARM_FRAMES).toBe(12);
    const o = occ("bounce", 100);
    expect(warmTargets(87, [o])).toEqual([]);
    expect(warmTargets(88, [o])).toEqual([{ action: ACTIONS.bounce, at: 100 }]);
    expect(warmTargets(99, [o])).toHaveLength(1);
    expect(warmTargets(100, [o])).toEqual([]); // playing: the player owns it
  });

  it("keeps one entry per element, nearest first, and caps the pool at 3 with the base", () => {
    expect(WARM_MAX_ACTIONS + 1).toBe(3);
    const t = warmTargets(90, [
      undefined,
      occ("nod", 101),
      occ("bounce", 95),
      occ("bounce", 99),
    ]);
    expect(t.map((w) => [w.action.id, w.at])).toEqual([
      ["bounce", 95],
      ["nod", 101],
    ]);
    expect(
      warmTargets(90, [occ("nod", 95), occ("bounce", 96)], 12, 1),
    ).toHaveLength(1);
  });
});
