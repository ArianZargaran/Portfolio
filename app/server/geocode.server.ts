/**
 * Event location -> coordinates. "lat,lon" is parsed locally (preferred, no
 * network). A place name is geocoded with Open-Meteo's free geocoding API
 * and cached for 24 h. Returns null when unresolvable (caller uses Dallas).
 */
import type { LatLon } from "./weather.server";

type Fetch = typeof fetch;

export function parseLatLon(input: string): LatLon | null {
  const m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(
    input,
  );
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

export interface Place extends LatLon {
  timeZone?: string;
}

export function createGeocoder({
  fetchImpl = fetch,
  now = () => Date.now(),
  ttlMs = 24 * 3600 * 1000,
}: { fetchImpl?: Fetch; now?: () => number; ttlMs?: number } = {}) {
  const cache = new Map<string, { at: number; value: Place | null }>();
  return async function geocode(location: string): Promise<Place | null> {
    const ll = parseLatLon(location);
    if (ll) return ll;
    const name = location.split(",")[0].trim();
    if (!name) return null;
    const key = name.toLowerCase();
    const hit = cache.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.value;
    try {
      const res = await fetchImpl(
        `https://geocoding-api.open-meteo.com/v1/search?count=1&format=json&name=${encodeURIComponent(name)}`,
        { signal: AbortSignal.timeout(1500) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as {
        results?: { latitude: number; longitude: number; timezone?: string }[];
      };
      const r = body.results?.[0];
      const value = r
        ? { lat: r.latitude, lon: r.longitude, timeZone: r.timezone }
        : null;
      cache.set(key, { at: now(), value });
      return value;
    } catch {
      return hit?.value ?? null;
    }
  };
}
