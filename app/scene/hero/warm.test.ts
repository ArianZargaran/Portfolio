import { fixtureVariant } from "./__fixtures__/actions";
import { ACTIONS, type ActionDef } from "./actions";
import type { Occurrence } from "./schedule";
import { WARM_FRAMES, WARM_MAX_ACTIONS, warmTargets } from "./warm";

const FX72 = fixtureVariant(72);
const REG: Record<string, ActionDef> = { ...ACTIONS, [FX72.id]: FX72 };
const occ = (a: string, clipAt: number): Occurrence => ({
  action: REG[a],
  cycle: 0,
  start: clipAt - REG[a].clip.firstFrame,
});

describe("warm hidden videos (M6)", () => {
  it("warms a clip at most 1 s ahead of its first frame, not after it starts", () => {
    expect(WARM_FRAMES).toBe(12);
    const o = occ("fx.k72", 100);
    expect(warmTargets(87, [o])).toEqual([]);
    expect(warmTargets(88, [o])).toEqual([{ action: FX72, at: 100 }]);
    expect(warmTargets(99, [o])).toHaveLength(1);
    expect(warmTargets(100, [o])).toEqual([]); // playing: the player owns it
  });

  it("keeps one entry per element, nearest first, and caps the pool at 3 with the base", () => {
    expect(WARM_MAX_ACTIONS + 1).toBe(3);
    const t = warmTargets(90, [
      undefined,
      occ("nod.k180", 101),
      occ("fx.k72", 95),
      occ("fx.k72", 99),
    ]);
    expect(t.map((w) => [w.action.id, w.at])).toEqual([
      ["fx.k72", 95],
      ["nod.k180", 101],
    ]);
    expect(
      warmTargets(90, [occ("nod.k180", 95), occ("fx.k72", 96)], 12, 1),
    ).toHaveLength(1);
  });
});
