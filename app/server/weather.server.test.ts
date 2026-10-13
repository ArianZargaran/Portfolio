import {
  createWeatherClient,
  DALLAS,
  wmoToWeather,
  WEATHER_TTL_MS,
} from "./weather.server";

const ok = (code: number) =>
  new Response(JSON.stringify({ current: { weather_code: code } }), {
    status: 200,
  });

describe("wmoToWeather", () => {
  it.each([
    [0, "clear"],
    [1, "clear"],
    [2, "cloudy"],
    [3, "cloudy"],
    [45, "fog"],
    [48, "fog"],
    [51, "rain"],
    [65, "rain"],
    [81, "rain"],
    [71, "snow"],
    [86, "snow"],
    [95, "storm"],
    [99, "storm"],
  ] as const)("code %i -> %s", (code, w) => expect(wmoToWeather(code)).toBe(w));
  it("returns null for unknown codes", () =>
    expect(wmoToWeather(42)).toBeNull());
});

describe("weather client", () => {
  it("queries Open-Meteo for Dallas by default and caches for 15 minutes", async () => {
    let t = 0;
    const fetchImpl = vi.fn().mockImplementation(async () => ok(3));
    const c = createWeatherClient({
      fetchImpl,
      now: () => t,
      log: () => undefined,
    });
    expect(await c.get()).toBe("cloudy");
    expect(fetchImpl.mock.calls[0][0]).toContain(`latitude=${DALLAS.lat}`);
    t = WEATHER_TTL_MS - 1;
    await c.get();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    t = WEATHER_TTL_MS + 1;
    await c.get();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("uses a travel location as a separate cache key", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => ok(0));
    const c = createWeatherClient({ fetchImpl, log: () => undefined });
    await c.get();
    await c.get({ lat: 40.4168, lon: -3.7038 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns null on outage with no cache, and never throws", async () => {
    const c = createWeatherClient({
      fetchImpl: vi.fn().mockRejectedValue(new Error("down")),
      log: () => undefined,
    });
    await expect(c.get()).resolves.toBeNull();
  });

  it("serves stale weather when a refresh fails", async () => {
    let t = 0;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(ok(61))
      .mockResolvedValueOnce(new Response("", { status: 503 }));
    const c = createWeatherClient({
      fetchImpl,
      now: () => t,
      log: () => undefined,
    });
    expect(await c.get()).toBe("rain");
    t = WEATHER_TTL_MS + 1;
    expect(await c.get()).toBe("rain");
  });

  it("dedupes concurrent requests", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => ok(0));
    const c = createWeatherClient({ fetchImpl, log: () => undefined });
    await Promise.all([c.get(), c.get(), c.get()]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
