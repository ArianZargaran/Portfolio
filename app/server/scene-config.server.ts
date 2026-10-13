/**
 * Wires the scene-state module from environment variables (names only;
 * values live in Vercel env). Provider choice:
 *   SCENE_CALENDAR_PROVIDER=ical|google|mock|none  (optional, auto-detected)
 *   SCENE_CALENDAR_ICAL_URL            primary: secret iCal address
 *   GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY, SCENE_CALENDAR_ID   alternative
 *   SCENE_TIME_ZONE         home zone, default America/Chicago
 *   SCENE_TRAVEL_TIME_ZONE  "event" (default: the event's own zone, fallback
 *                           America/Chicago) or an IANA zone to pin one
 */
import { GoogleCalendarProvider } from "./calendar/google.server";
import { IcalCalendarProvider } from "./calendar/ical.server";
import { MockCalendarProvider, NoCalendarProvider } from "./calendar/mock";
import type { CalendarProvider } from "./calendar/types";
import { createGeocoder } from "./geocode.server";
import type { SceneDeps } from "./scene-state.server";
import { DEFAULT_TIME_ZONE } from "./time.server";
import { createWeatherClient } from "./weather.server";

type Env = Record<string, string | undefined>;

export function calendarFromEnv(env: Env): CalendarProvider {
  const kind =
    env.SCENE_CALENDAR_PROVIDER ??
    (env.SCENE_CALENDAR_ICAL_URL
      ? "ical"
      : env.GOOGLE_SA_EMAIL &&
          env.GOOGLE_SA_PRIVATE_KEY &&
          env.SCENE_CALENDAR_ID
        ? "google"
        : "none");
  switch (kind) {
    case "ical":
      if (!env.SCENE_CALENDAR_ICAL_URL)
        throw new Error("SCENE_CALENDAR_ICAL_URL is not set");
      return new IcalCalendarProvider(env.SCENE_CALENDAR_ICAL_URL);
    case "google":
      if (
        !env.GOOGLE_SA_EMAIL ||
        !env.GOOGLE_SA_PRIVATE_KEY ||
        !env.SCENE_CALENDAR_ID
      )
        throw new Error(
          "GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY and SCENE_CALENDAR_ID are required",
        );
      return new GoogleCalendarProvider({
        clientEmail: env.GOOGLE_SA_EMAIL,
        privateKey: env.GOOGLE_SA_PRIVATE_KEY,
        calendarId: env.SCENE_CALENDAR_ID,
      });
    case "mock":
      return new MockCalendarProvider([
        {
          summary: "home-office.desk.coding.*.*.v3.2",
          start: new Date(0),
          end: new Date(8.64e15),
        },
      ]);
    case "none":
      return new NoCalendarProvider();
    default:
      throw new Error(`unknown SCENE_CALENDAR_PROVIDER ${kind}`);
  }
}

let deps: SceneDeps | undefined;

export function sceneDepsFromEnv(env: Env = process.env): SceneDeps {
  if (deps) return deps;
  let calendar: CalendarProvider;
  try {
    calendar = calendarFromEnv(env);
  } catch (err) {
    console.error(
      "[scene-state] calendar misconfigured; serving defaults",
      (err as Error).message,
    );
    calendar = new NoCalendarProvider();
  }
  const weather = createWeatherClient();
  deps = {
    calendar,
    weather: (loc) => weather.get(loc),
    geocode: createGeocoder(),
    config: {
      timeZone: env.SCENE_TIME_ZONE || DEFAULT_TIME_ZONE,
      travelTimeZone: env.SCENE_TRAVEL_TIME_ZONE || "event",
    },
  };
  return deps;
}
