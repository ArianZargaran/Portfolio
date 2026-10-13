import {
  localMinutes,
  sunTimes,
  timeSlot,
  tzOffsetMinutes,
  zonedWallTimeToDate,
} from "./time.server";
import { DALLAS } from "./weather.server";

const CHI = "America/Chicago";
const at = (y: number, mo: number, d: number, h: number, mi = 0, tz = CHI) =>
  zonedWallTimeToDate(y, mo, d, h, mi, 0, tz);
const slot = (date: Date, tz = CHI) =>
  timeSlot(date, { ...DALLAS, timeZone: tz });

describe("Chicago time and DST", () => {
  it("offsets are CDT in summer and CST in winter", () => {
    expect(tzOffsetMinutes(new Date("2026-07-01T12:00:00Z"), CHI)).toBe(-300);
    expect(tzOffsetMinutes(new Date("2026-12-01T12:00:00Z"), CHI)).toBe(-360);
  });

  it("handles the fall-back day (2026-11-01) without shifting slots", () => {
    // 13:00 local on both sides of the change is still noon slot.
    expect(slot(at(2026, 10, 31, 13))).toBe("noon");
    expect(slot(at(2026, 11, 1, 13))).toBe("noon");
    expect(localMinutes(at(2026, 11, 1, 13), CHI)).toBe(13 * 60);
  });

  it("handles the spring-forward day (2027-03-14)", () => {
    expect(slot(at(2027, 3, 14, 12))).toBe("noon");
    expect(localMinutes(at(2027, 3, 14, 12), CHI)).toBe(12 * 60);
  });

  it("computes Dallas sunrise/sunset plausibly (summer solstice)", () => {
    const s = sunTimes(at(2026, 6, 21, 12), DALLAS.lat, DALLAS.lon, CHI)!;
    const rise = localMinutes(s.sunrise, CHI);
    const set = localMinutes(s.sunset, CHI);
    expect(rise).toBeGreaterThan(6 * 60 + 15); // ~06:20 CDT
    expect(rise).toBeLessThan(6 * 60 + 30);
    expect(set).toBeGreaterThan(20 * 60 + 30); // ~20:38 CDT
    expect(set).toBeLessThan(20 * 60 + 45);
  });
});

describe("timeSlot boundaries (Dallas, 2026-10-13: sunrise ~07:25, sunset ~19:00 CDT)", () => {
  it.each([
    [3, 0, "night"],
    [7, 0, "dawn"],
    [9, 0, "morning"],
    [11, 29, "morning"],
    [11, 30, "noon"],
    [13, 59, "noon"],
    [14, 0, "afternoon"],
    [18, 30, "dusk"],
    [19, 30, "dusk"],
    [20, 0, "night"],
    [23, 59, "night"],
  ] as const)("%i:%i -> %s", (h, m, expected) => {
    expect(slot(at(2026, 10, 13, h, m))).toBe(expected);
  });
});

describe("configurable time zone", () => {
  it("uses the given zone for the slot (Madrid noon is Chicago morning)", () => {
    const d = new Date("2026-10-13T11:00:00Z"); // 13:00 Madrid, 06:00 Chicago
    expect(
      timeSlot(d, { lat: 40.42, lon: -3.7, timeZone: "Europe/Madrid" }),
    ).toBe("noon");
    expect(slot(d)).toBe("night");
  });

  it("falls back to Chicago for an invalid zone", () => {
    const d = at(2026, 10, 13, 12);
    expect(timeSlot(d, { ...DALLAS, timeZone: "Not/AZone" })).toBe("noon");
  });
});
