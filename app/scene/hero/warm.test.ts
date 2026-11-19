import { fixtureVariant } from "./__fixtures__/actions";
import { ACTIONS, type ActionDef } from "./actions";
import type { Occurrence } from "./schedule";
import {
  isPrimed,
  WARM_FRAMES,
  WARM_MAX_ACTIONS,
  warmTargets,
  type PrimeProbe,
} from "./warm";

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

describe("isPrimed (review N2: a paused, decoded first frame is ready)", () => {
  const v = (o: Partial<PrimeProbe> = {}): PrimeProbe => ({
    readyState: 2,
    seeking: false,
    paused: true,
    currentTime: 0.04, // the warm pool seeks to frameTime(0) = half a frame
    ...o,
  });
  it("paused on frame 0 with the current frame decoded: primed", () => {
    expect(isPrimed(v(), 0, 12)).toBe(true);
    expect(isPrimed(v({ readyState: 4 }), 0, 12)).toBe(true);
  });
  it("not decoded, still seeking, playing, or on another frame: not primed", () => {
    expect(isPrimed(v({ readyState: 1 }), 0, 12)).toBe(false);
    expect(isPrimed(v({ seeking: true }), 0, 12)).toBe(false);
    expect(isPrimed(v({ paused: false }), 0, 12)).toBe(false);
    expect(isPrimed(v({ currentTime: 0.125 }), 0, 12)).toBe(false);
    expect(isPrimed(v(), 1, 12)).toBe(false);
  });
});
