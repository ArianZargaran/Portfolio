import { BASE_LOOP } from "./actions";
import {
  HERO_JOIN,
  JOIN_V5_1,
  joinPointsEvery,
  nextJoinAbs,
  validateJoinConfig,
  type JoinConfig,
} from "./join-config";

describe("join points (3 s home pose, 18 s loop)", () => {
  it("are every 36 frames on the 216-frame loop: f0/36/72/108/144/180", () => {
    expect(JOIN_V5_1.points).toEqual([0, 36, 72, 108, 144, 180]);
    expect(JOIN_V5_1.step / JOIN_V5_1.fps).toBe(3);
    expect(BASE_LOOP.frames / BASE_LOOP.fps).toBe(18);
  });

  it("the active config fits the shipped base loop", () => {
    expect(validateJoinConfig(HERO_JOIN)).toEqual([]);
    expect(HERO_JOIN.homePoseClean).toBe(false); // until B1 (v5_2) lands
  });

  it("B1 hook: a different loop config is validated, not hard-coded", () => {
    const v5_2: JoinConfig = {
      ...JOIN_V5_1,
      loop: "V5_2",
      homePoseClean: true,
    };
    expect(validateJoinConfig(v5_2)).toEqual([]);
    expect(validateJoinConfig({ ...JOIN_V5_1, loopFrames: 288 })).toContain(
      "loopFrames 288 != base 216",
    );
    expect(validateJoinConfig({ ...JOIN_V5_1, step: 50 })).toContain(
      "step 50 does not divide the loop",
    );
    expect(joinPointsEvery(36, 288)).toHaveLength(8);
  });

  it("nextJoinAbs finds the earliest allowed join, wrapping to the next cycle", () => {
    expect(nextJoinAbs(0, [72], 216)).toBe(72);
    expect(nextJoinAbs(73, [72], 216)).toBe(216 + 72);
    expect(nextJoinAbs(200, [0, 180], 216)).toBe(216);
    expect(nextJoinAbs(5 * 216 + 1, JOIN_V5_1.points, 216)).toBe(5 * 216 + 36);
    expect(nextJoinAbs(10, [], 216)).toBeUndefined();
  });
});
