import { DEFAULT_FEATURES, readFeatures } from "./features";

describe("readFeatures", () => {
  it("defaults every flag to off", () => {
    expect(readFeatures({})).toEqual({ skillsChat: false });
    expect(DEFAULT_FEATURES.skillsChat).toBe(false);
  });
  it.each(["1", "true", "TRUE", "on", "yes", " 1 "])("treats %j as on", (v) => {
    expect(readFeatures({ FEATURE_SKILLS_CHAT: v }).skillsChat).toBe(true);
  });
  it.each(["", "0", "false", "off", "no", "maybe"])("treats %j as off", (v) => {
    expect(readFeatures({ FEATURE_SKILLS_CHAT: v }).skillsChat).toBe(false);
  });
});
