import { calendarFromEnv } from "./scene-config.server";

describe("calendarFromEnv", () => {
  it("prefers the secret iCal URL", () => {
    expect(
      calendarFromEnv({
        SCENE_CALENDAR_ICAL_URL: "https://calendar.google.com/x/basic.ics",
        GOOGLE_SA_EMAIL: "a",
        GOOGLE_SA_PRIVATE_KEY: "b",
        SCENE_CALENDAR_ID: "c",
      }).name,
    ).toBe("ical");
  });
  it("uses the service account when no iCal URL is set", () => {
    expect(
      calendarFromEnv({
        GOOGLE_SA_EMAIL: "a",
        GOOGLE_SA_PRIVATE_KEY: "b",
        SCENE_CALENDAR_ID: "c",
      }).name,
    ).toBe("google");
  });
  it("falls back to none (default scenes) when nothing is configured", () => {
    expect(calendarFromEnv({}).name).toBe("none");
  });
  it("supports an explicit mock for local dev", () => {
    expect(calendarFromEnv({ SCENE_CALENDAR_PROVIDER: "mock" }).name).toBe(
      "mock",
    );
  });
  it("throws on an incomplete explicit config", () => {
    expect(() =>
      calendarFromEnv({ SCENE_CALENDAR_PROVIDER: "google" }),
    ).toThrow();
  });
});
