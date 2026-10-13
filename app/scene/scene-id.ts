import type { Activity, Base, Spot, TimeOfDay, Weather } from "./vocab";
import { ACTIVITIES, BASES, SPOTS, TIMES, WEATHERS } from "./vocab";

/** Fully resolved scene ID: <base>.<spot>.<activity>.<time>.<weather>.v<n>[.<m>] */
export type SceneId = string;

export interface SceneParts {
  base: Base;
  spot: Spot;
  activity: Activity;
  /** "*" = resolve live from the clock. */
  time: TimeOfDay | "*";
  /** "*" = resolve live from real weather. */
  weather: Weather | "*";
  version: string; // "3" or "3.2"
}

const has = <T extends string>(list: readonly T[], v: string): v is T =>
  (list as readonly string[]).includes(v);

/** Parse a scene ID or calendar pattern (wildcards allowed for time/weather).
    Returns null for anything that doesn't match the vocabulary exactly. */
export function parseScenePattern(
  input: string | undefined | null,
): SceneParts | null {
  if (!input) return null;
  const m =
    /^([a-z-]+)\.([a-z-]+)\.([a-z-]+)\.([a-z*]+)\.([a-z*]+)\.v(\d+(?:\.\d+)?)$/.exec(
      input.trim(),
    );
  if (!m) return null;
  const [, base, spot, activity, time, weather, version] = m;
  if (!has(BASES, base) || !has(SPOTS, spot) || !has(ACTIVITIES, activity))
    return null;
  if (time !== "*" && !has(TIMES, time)) return null;
  if (weather !== "*" && !has(WEATHERS, weather)) return null;
  return { base, spot, activity, time, weather, version } as SceneParts;
}

export function formatSceneId(
  p: SceneParts & { time: TimeOfDay; weather: Weather },
): SceneId {
  return `${p.base}.${p.spot}.${p.activity}.${p.time}.${p.weather}.v${p.version}`;
}

export function isSceneId(input: string): boolean {
  const p = parseScenePattern(input);
  return !!p && p.time !== "*" && p.weather !== "*";
}
