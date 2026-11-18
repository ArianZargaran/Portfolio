import { BASE_LOOP } from "./actions";
import {
  HERO_JOIN,
  HERO_JOIN_VERSION,
  JOIN_CONFIGS,
  JOIN_V5_1,
  JOIN_V5_2,
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

  it("v5_2 (provisional): joins every 36 frames, home pose clean, valid", () => {
    expect(JOIN_V5_2.points).toEqual([0, 36, 72, 108, 144, 180]);
    expect(JOIN_V5_2.step).toBe(36);
    expect(JOIN_V5_2.homePoseClean).toBe(true);
    expect(JOIN_V5_2.provisional).toBe(true);
    expect(validateJoinConfig(JOIN_V5_2)).toEqual([]);
    expect(JOIN_CONFIGS).toEqual({ v5_1: JOIN_V5_1, v5_2: JOIN_V5_2 });
  });

  it("the default build stays on v5_1 until Ari locks v5_2", () => {
    expect(HERO_JOIN_VERSION).toBe("v5_1");
    expect(HERO_JOIN).toBe(JOIN_V5_1);
    expect(HERO_JOIN.loop).toBe("LOCK_PAINTED_CHAR_TYPING_LOOP_V5_1");
  });

  it("the active config is never provisional (flip the switch only after the lock)", () => {
    expect(HERO_JOIN.provisional).toBeUndefined();
    expect(HERO_JOIN.loop).toMatch(/^LOCK_/);
  });

  it("rejects points off the step grid", () => {
    expect(
      validateJoinConfig({ ...JOIN_V5_2, points: [0, 36, 70, 108, 144, 180] }),
    ).toContain("points not on the 36-frame grid");
  });

  it("nextJoinAbs finds the earliest allowed join, wrapping to the next cycle", () => {
    expect(nextJoinAbs(0, [72], 216)).toBe(72);
    expect(nextJoinAbs(73, [72], 216)).toBe(216 + 72);
    expect(nextJoinAbs(200, [0, 180], 216)).toBe(216);
    expect(nextJoinAbs(5 * 216 + 1, JOIN_V5_1.points, 216)).toBe(5 * 216 + 36);
    expect(nextJoinAbs(10, [], 216)).toBeUndefined();
  });
});
