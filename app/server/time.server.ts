/**
 * Time-of-day slots (docs/architecture.md 4.1), DST-safe. All wall-clock
 * reasoning goes through Intl with an explicit IANA zone; we never use the
 * server's local zone.
 */
import type { TimeOfDay } from "~/scene/vocab";

export const DEFAULT_TIME_ZONE = "America/Chicago";

export function isValidTimeZone(tz: string | undefined | null): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Minutes since local midnight in `timeZone`. */
export function localMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const m = Number(parts.find((p) => p.type === "minute")?.value);
  return h * 60 + m;
}

/** Local calendar date (Y, M, D) in `timeZone`. */
export function localDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** UTC offset (minutes, east positive) of `timeZone` at `date`. */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** Convert a wall-clock time in `timeZone` to an instant (handles DST). */
export function zonedWallTimeToDate(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let off = tzOffsetMinutes(new Date(guess), timeZone);
  let t = guess - off * 60000;
  const off2 = tzOffsetMinutes(new Date(t), timeZone);
  if (off2 !== off) {
    off = off2;
    t = guess - off * 60000;
  }
  return new Date(t);
}

const rad = Math.PI / 180;

/**
 * Sunrise/sunset as UTC instants for the local date of `date` at lat/lon
 * (NOAA general solar position approximation, ~1-2 min accuracy). Returns
 * null for polar day/night.
 */
export function sunTimes(
  date: Date,
  lat: number,
  lon: number,
  timeZone: string,
) {
  const { year, month, day } = localDate(date, timeZone);
  const noonUtc = Date.UTC(year, month - 1, day, 12);
  const doy = Math.floor((noonUtc - Date.UTC(year, 0, 0)) / 86400000);
  const g = ((2 * Math.PI) / 365) * (doy - 1);
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const cosH =
    Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) -
    Math.tan(lat * rad) * Math.tan(decl);
  if (cosH < -1 || cosH > 1) return null;
  const ha = Math.acos(cosH) / rad;
  const dayStart = Date.UTC(year, month - 1, day);
  const sunriseMin = 720 - 4 * (lon + ha) - eqtime;
  const sunsetMin = 720 - 4 * (lon - ha) - eqtime;
  return {
    sunrise: new Date(dayStart + sunriseMin * 60000),
    sunset: new Date(dayStart + sunsetMin * 60000),
  };
}

const FIXED = {
  dawn: 360,
  morning: 480,
  noon: 690,
  afternoon: 840,
  dusk: 1080,
  night: 1230,
};

/** Slot for `now` in `timeZone`; sun times at lat/lon, fixed table as fallback. */
export function timeSlot(
  now: Date,
  {
    timeZone = DEFAULT_TIME_ZONE,
    lat,
    lon,
  }: { timeZone?: string; lat: number; lon: number },
): TimeOfDay {
  const tz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
  const mins = localMinutes(now, tz);
  let b = { ...FIXED };
  const sun = sunTimes(now, lat, lon, tz);
  if (sun) {
    const rise = localMinutes(sun.sunrise, tz);
    const set = localMinutes(sun.sunset, tz);
    if (rise < set) {
      b = {
        dawn: rise - 45,
        morning: rise + 45,
        noon: Math.max(rise + 45, 690),
        afternoon: 840,
        dusk: Math.max(840, set - 60),
        night: set + 45,
      };
    }
  }
  if (mins >= b.night || mins < b.dawn) return "night";
  if (mins < b.morning) return "dawn";
  if (mins < b.noon) return "morning";
  if (mins < b.afternoon) return "noon";
  if (mins < b.dusk) return "afternoon";
  return "dusk";
}
