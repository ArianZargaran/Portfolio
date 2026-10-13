/**
 * Scene state: which scene is showing right now. Server-only.
 *
 * resolveScene() never throws. Calendar or weather failures degrade to the
 * time-of-day default scene / default weather (docs/architecture.md 4).
 * Output is a whitelist: sceneId, time, weather, source, expiresAt. No event
 * text, location, ticket or account data ever leaves this module.
 */
import { formatSceneId, parseScenePattern } from "~/scene/scene-id";
import type { TimeOfDay, Weather } from "~/scene/vocab";

import type { CalendarEvent, CalendarProvider } from "./calendar/types";
import type { Place } from "./geocode.server";
import { DEFAULT_TIME_ZONE, isValidTimeZone, timeSlot } from "./time.server";
import type { LatLon } from "./weather.server";
import { DALLAS } from "./weather.server";

export interface SceneState {
  sceneId: string;
  time: TimeOfDay;
  weather: Weather;
  source: "calendar" | "default";
  /** ISO time after which clients should re-check. */
  expiresAt: string;
}

export const DEFAULT_WEATHER: Weather = "clear";

/** Draft default scene per slot (architecture.md 4.2). */
export const DEFAULT_SCENES: Record<TimeOfDay, string> = {
  dawn: "home-office.window.thinking.dawn.*.v1",
  morning: "home-office.desk.coding.morning.*.v1",
  noon: "home-office.kitchen.eating.noon.*.v1",
  afternoon: "home-office.desk.designing.afternoon.*.v1",
  dusk: "home-office.desk.coding.dusk.clear.v3.2",
  night: "home-office.couch.resting.night.*.v1",
};

export interface SceneConfig {
  /** Home time zone for slots. Default America/Chicago. */
  timeZone: string;
  /**
   * Time zone used for the slot while travelling (event has a location).
   * An IANA zone (default America/Chicago, so time keeps following Chicago
   * per the graph), or "event" to use the trip's own zone (event TZID, else
   * the geocoded place's zone).
   */
  travelTimeZone: string | "event";
  home: LatLon;
}

export const defaultSceneConfig = (): SceneConfig => ({
  timeZone: DEFAULT_TIME_ZONE,
  travelTimeZone: DEFAULT_TIME_ZONE,
  home: DALLAS,
});

export interface SceneDeps {
  calendar: CalendarProvider;
  weather: (loc: LatLon) => Promise<Weather | null>;
  geocode: (location: string) => Promise<Place | null>;
  log?: (msg: string, err?: unknown) => void;
  config?: Partial<SceneConfig>;
}

const EXPIRY_MS = 60_000;

/** The event that started last wins; ties -> first in list. Invalid IDs are skipped. */
function pickEvent(events: CalendarEvent[]) {
  return events
    .map((e) => ({ e, parts: parseScenePattern(e.summary) }))
    .filter((x) => x.parts)
    .sort((a, b) => b.e.start.getTime() - a.e.start.getTime())[0];
}

export async function resolveScene(
  now: Date,
  deps: SceneDeps,
): Promise<SceneState> {
  const cfg = { ...defaultSceneConfig(), ...deps.config };
  const log =
    deps.log ??
    ((m: string, err?: unknown) =>
      console.warn(`[scene-state] ${m}`, err ?? ""));
  const homeTz = isValidTimeZone(cfg.timeZone)
    ? cfg.timeZone
    : DEFAULT_TIME_ZONE;

  let events: CalendarEvent[] = [];
  try {
    events = await deps.calendar.eventsAt(now);
  } catch (err) {
    log("calendar unavailable; using default scene", err);
  }
  const chosen = pickEvent(events);
  if (events.length && !chosen)
    log(`no valid scene id among ${events.length} event(s)`);

  // Location: travel override or home.
  let place: Place = cfg.home;
  let travelling = false;
  if (chosen?.e.location) {
    try {
      const p = await deps.geocode(chosen.e.location);
      if (p) {
        place = p;
        travelling = true;
      } else log("event location not resolvable; using home location");
    } catch (err) {
      log("geocode failed; using home location", err);
    }
  }

  let tz = homeTz;
  if (travelling) {
    if (cfg.travelTimeZone === "event") {
      const evTz = [chosen?.e.timeZone, place.timeZone].find(isValidTimeZone);
      tz = evTz ?? homeTz;
    } else if (isValidTimeZone(cfg.travelTimeZone)) {
      tz = cfg.travelTimeZone;
    }
  }

  // Sun times must come from the place whose clock we use: when the slot
  // follows the home zone, use home coordinates; otherwise the trip's.
  const sunAt = tz === homeTz ? cfg.home : place;
  const slot = timeSlot(now, { timeZone: tz, lat: sunAt.lat, lon: sunAt.lon });

  let live: Weather | null = null;
  const needsWeather = !chosen || chosen.parts!.weather === "*";
  if (needsWeather) {
    try {
      live = await deps.weather({ lat: place.lat, lon: place.lon });
    } catch (err) {
      log("weather failed; using default weather", err);
    }
  }

  const expiresAt = new Date(now.getTime() + EXPIRY_MS).toISOString();

  if (chosen) {
    const p = chosen.parts!;
    const time = p.time === "*" ? slot : p.time;
    const weather = p.weather === "*" ? (live ?? DEFAULT_WEATHER) : p.weather;
    return {
      sceneId: formatSceneId({ ...p, time, weather }),
      time,
      weather,
      source: "calendar",
      expiresAt,
    };
  }

  const def = parseScenePattern(DEFAULT_SCENES[slot])!;
  const weather = def.weather === "*" ? (live ?? DEFAULT_WEATHER) : def.weather;
  const time = def.time === "*" ? slot : def.time;
  return {
    sceneId: formatSceneId({ ...def, time, weather }),
    time,
    weather,
    source: "default",
    expiresAt,
  };
}
