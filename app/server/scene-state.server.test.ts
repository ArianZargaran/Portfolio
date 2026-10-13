import { MockCalendarProvider } from "./calendar/mock";
import { createGeocoder } from "./geocode.server";
import type { SceneDeps } from "./scene-state.server";
import { DEFAULT_SCENES, resolveScene } from "./scene-state.server";
import { zonedWallTimeToDate } from "./time.server";

const CHI = "America/Chicago";
const chi = (d: number, h: number, mi = 0, mo = 10) =>
  zonedWallTimeToDate(2026, mo, d, h, mi, 0, CHI);

function deps(
  over: Partial<SceneDeps> = {},
  events = new MockCalendarProvider(),
) {
  const log = vi.fn();
  const d: SceneDeps = {
    calendar: events,
    weather: vi.fn(async () => "cloudy" as const),
    geocode: createGeocoder({
      fetchImpl: (async () =>
        Response.json({
          results: [
            {
              latitude: 40.4168,
              longitude: -3.7038,
              timezone: "Europe/Madrid",
            },
          ],
        })) as typeof fetch,
    }),
    log,
    ...over,
  };
  return { d, log };
}

const ev = (
  summary: string,
  start: Date,
  end: Date,
  extra: Record<string, unknown> = {},
) => ({
  summary,
  start,
  end,
  ...extra,
});

describe("resolveScene", () => {
  it("empty slot -> time-of-day default with live weather", async () => {
    const { d } = deps();
    const s = await resolveScene(chi(13, 18, 30), d);
    expect(s).toMatchObject({
      source: "default",
      time: "dusk",
      sceneId: DEFAULT_SCENES.dusk,
      weather: "clear",
    });
    const m = await resolveScene(chi(13, 9), d);
    expect(m).toMatchObject({
      source: "default",
      time: "morning",
      weather: "cloudy",
      sceneId: "home-office.desk.coding.morning.cloudy.v1",
    });
  });

  it("uses the calendar event, resolving * time/weather live", async () => {
    const cal = new MockCalendarProvider([
      ev("home-office.desk.coding.*.*.v3", chi(13, 8), chi(13, 12)),
    ]);
    const s = await resolveScene(chi(13, 11, 45), deps({}, cal).d);
    expect(s).toMatchObject({
      source: "calendar",
      sceneId: "home-office.desk.coding.noon.cloudy.v3",
      time: "noon",
    });
  });

  it("keeps explicit time/weather from the event and skips the weather call", async () => {
    const cal = new MockCalendarProvider([
      ev("office.desk.designing.dusk.rain.v2", chi(13, 8), chi(13, 12)),
    ]);
    const { d } = deps({}, cal);
    const s = await resolveScene(chi(13, 9), d);
    expect(s.sceneId).toBe("office.desk.designing.dusk.rain.v2");
    expect(d.weather).not.toHaveBeenCalled();
  });

  it("calendar outage -> default scene, logged, never throws", async () => {
    const cal = new MockCalendarProvider();
    cal.fail = true;
    const { d, log } = deps({}, cal);
    const s = await resolveScene(chi(13, 15), d);
    expect(s).toMatchObject({ source: "default", time: "afternoon" });
    expect(log).toHaveBeenCalled();
  });

  it("weather outage alone keeps the event scene with default weather", async () => {
    const cal = new MockCalendarProvider([
      ev("home-office.desk.coding.*.*.v3", chi(13, 8), chi(13, 12)),
    ]);
    const { d } = deps(
      {
        weather: vi.fn(async () => {
          throw new Error("down");
        }),
      },
      cal,
    );
    const s = await resolveScene(chi(13, 9), d);
    expect(s).toMatchObject({
      source: "calendar",
      weather: "clear",
      sceneId: "home-office.desk.coding.morning.clear.v3",
    });
  });

  it("invalid scene ID -> default scene", async () => {
    const cal = new MockCalendarProvider([
      ev("Lunch with Bob", chi(13, 8), chi(13, 12)),
      ev("home-office.desk.flying.*.*.v1", chi(13, 8), chi(13, 12)),
    ]);
    const { d, log } = deps({}, cal);
    const s = await resolveScene(chi(13, 9), d);
    expect(s.source).toBe("default");
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/no valid scene id/),
    );
  });

  it("overlap: the event that started last wins", async () => {
    const cal = new MockCalendarProvider([
      ev("home-office.desk.coding.*.*.v3", chi(13, 8), chi(13, 12)),
      ev("home-office.couch.reading.*.*.v1", chi(13, 10), chi(13, 11)),
    ]);
    expect(
      (await resolveScene(chi(13, 10, 30), deps({}, cal).d)).sceneId,
    ).toMatch(/^home-office\.couch\.reading/);
  });

  it("travel: location overrides Dallas for weather; slot can be pinned to Chicago", async () => {
    const cal = new MockCalendarProvider([
      ev("plane.seat.reading.*.*.v1", chi(13, 0), chi(14, 0), {
        location: "Madrid, Spain",
      }),
    ]);
    const weather = vi.fn(async () => "rain" as const);
    const { d } = deps(
      { weather, config: { travelTimeZone: "America/Chicago" } },
      cal,
    );
    const now = chi(13, 6); // 06:00 Chicago = 13:00 Madrid
    const s = await resolveScene(now, d);
    expect(weather).toHaveBeenCalledWith({ lat: 40.4168, lon: -3.7038 });
    expect(s.weather).toBe("rain");
    // Slot follows Chicago (wall clock and Dallas sun): 06:00 CDT is night.
    expect(s.time).toBe("night");
  });

  it("travel time zone defaults to the event's own zone (TZID wins)", async () => {
    const cal = new MockCalendarProvider([
      ev("plane.seat.reading.*.*.v1", chi(13, 0), chi(14, 0), {
        location: "40.4168,-3.7038",
        timeZone: "Europe/Madrid",
      }),
    ]);
    const { d } = deps({}, cal); // no config: default
    const s = await resolveScene(chi(13, 6), d); // 13:00 in Madrid
    expect(s.time).toBe("noon");
  });

  it("default 'event' mode falls back to the geocoded place's zone", async () => {
    const cal = new MockCalendarProvider([
      ev("plane.seat.reading.*.*.v1", chi(13, 0), chi(14, 0), {
        location: "Madrid",
      }),
    ]);
    const { d } = deps({}, cal);
    const s = await resolveScene(chi(13, 6), d); // 13:00 in Madrid
    expect(s.time).toBe("noon");
  });

  it("default 'event' mode falls back to America/Chicago when no zone is known", async () => {
    const cal = new MockCalendarProvider([
      ev("plane.seat.reading.*.*.v1", chi(13, 0), chi(14, 0), {
        location: "40.4168,-3.7038", // coordinates only, no TZID
      }),
    ]);
    const { d } = deps({}, cal);
    expect((await resolveScene(chi(13, 6), d)).time).toBe("night"); // 06:00 CDT
    expect((await resolveScene(chi(13, 12), d)).time).toBe("noon");
  });

  it("an invalid event zone falls back to Chicago", async () => {
    const cal = new MockCalendarProvider([
      ev("plane.seat.reading.*.*.v1", chi(13, 0), chi(14, 0), {
        location: "40.4168,-3.7038",
        timeZone: "Mars/Olympus",
      }),
    ]);
    const { d } = deps({}, cal);
    expect((await resolveScene(chi(13, 12), d)).time).toBe("noon");
  });

  it("'event' can also be set explicitly", async () => {
    const cal = new MockCalendarProvider([
      ev("plane.seat.reading.*.*.v1", chi(13, 0), chi(14, 0), {
        location: "Madrid",
      }),
    ]);
    const { d } = deps({ config: { travelTimeZone: "event" } }, cal);
    const s = await resolveScene(chi(13, 6), d); // 13:00 in Madrid
    expect(s.time).toBe("noon");
  });

  it("travel time zone is configurable: explicit IANA zone", async () => {
    const cal = new MockCalendarProvider([
      ev("plane.seat.reading.*.*.v1", chi(12, 0), chi(14, 0), {
        location: "35.68,139.69",
      }),
    ]);
    const { d } = deps({ config: { travelTimeZone: "Asia/Tokyo" } }, cal);
    const s = await resolveScene(new Date("2026-10-13T03:00:00Z"), d); // 12:00 Tokyo
    expect(s.time).toBe("noon");
  });

  it("home zone is configurable and invalid zones fall back to Chicago", async () => {
    const { d } = deps({ config: { timeZone: "Bad/Zone" } });
    expect((await resolveScene(chi(13, 12), d)).time).toBe("noon");
  });

  it("output is a strict whitelist (no event data leaks)", async () => {
    const cal = new MockCalendarProvider([
      {
        ...ev("home-office.desk.coding.*.*.v3", chi(13, 8), chi(13, 12), {
          location: "40.0,-3.0",
        }),
        description: "TICKET-9 secret",
        attendees: ["ari.port.folio.calendar@gmail.com"],
      },
    ]);
    const s = await resolveScene(chi(13, 9), deps({}, cal).d);
    expect(Object.keys(s).sort()).toEqual([
      "expiresAt",
      "sceneId",
      "source",
      "time",
      "weather",
    ]);
    expect(JSON.stringify(s)).not.toMatch(/TICKET|secret|gmail|40\.0/);
  });

  it("DST: same wall-clock time resolves the same slot on both sides of fall-back", async () => {
    const { d } = deps();
    expect((await resolveScene(chi(31, 12), d)).time).toBe(
      (await resolveScene(chi(1, 12, 0, 11), d)).time,
    );
  });
});
