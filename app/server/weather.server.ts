/**
 * Weather for the scene state: Open-Meteo (free, no API key), cached for 15
 * minutes per location. Maps WMO weather codes onto the scene weather
 * vocabulary. Never throws: on failure it returns null and the caller keeps
 * the event's weather or the default.
 *
 * Docs: https://open-meteo.com/en/docs (current=weather_code)
 */
import type { Weather } from "~/scene/vocab";

export interface LatLon {
  lat: number;
  lon: number;
}

/** Dallas, TX: the default location (graph vocab.weather rule). */
export const DALLAS: LatLon = { lat: 32.7767, lon: -96.797 };

export const WEATHER_TTL_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 1500;

/** WMO code -> scene weather. Unknown codes return null. */
export function wmoToWeather(code: number): Weather | null {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "storm";
  return null;
}

type Fetch = typeof fetch;
interface Entry {
  value: Weather | null;
  fetchedAt: number;
  pending?: Promise<Weather | null>;
}

export function createWeatherClient({
  fetchImpl = fetch,
  now = () => Date.now(),
  ttlMs = WEATHER_TTL_MS,
  log = (msg: string, err?: unknown) => console.warn(msg, err),
}: {
  fetchImpl?: Fetch;
  now?: () => number;
  ttlMs?: number;
  log?: (msg: string, err?: unknown) => void;
} = {}) {
  const cache = new Map<string, Entry>();

  async function fetchWeather({ lat, lon }: LatLon): Promise<Weather | null> {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=weather_code&timezone=UTC`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetchImpl(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`open-meteo HTTP ${res.status}`);
      const body = (await res.json()) as {
        current?: { weather_code?: number };
      };
      const code = body.current?.weather_code;
      if (typeof code !== "number")
        throw new Error("open-meteo: no weather_code");
      return wmoToWeather(code);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Cached weather. Serves stale on error (stale-if-error); null if never fetched. */
  async function get(loc: LatLon = DALLAS): Promise<Weather | null> {
    const key = `${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}`;
    const hit = cache.get(key);
    if (hit && now() - hit.fetchedAt < ttlMs) return hit.value;
    if (hit?.pending) return hit.pending;

    const pending = fetchWeather(loc)
      .then((value) => {
        cache.set(key, { value, fetchedAt: now() });
        return value;
      })
      .catch((err) => {
        log("weather fetch failed; using stale or default", err);
        const stale = hit?.value ?? null;
        if (hit) cache.set(key, { value: stale, fetchedAt: hit.fetchedAt });
        else cache.delete(key);
        return stale;
      });
    cache.set(key, {
      value: hit?.value ?? null,
      fetchedAt: hit?.fetchedAt ?? -Infinity,
      pending,
    });
    return pending;
  }

  return { get };
}
