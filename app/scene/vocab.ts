/** Scene vocabulary, mirrored from portfolio-brain/graph.yaml (signed-off
    nodes vocab.*). The graph is canonical; update both together. */
export const BASES = ["home-office", "office", "car", "plane"] as const;
export const SPOTS = [
  "desk",
  "window",
  "bed",
  "couch",
  "kitchen",
  "seat",
  "dock",
  "balcony",
] as const;
export const ACTIVITIES = [
  "coding",
  "designing",
  "reading",
  "listening",
  "resting",
  "eating",
  "commuting",
  "thinking",
] as const;
export const TIMES = [
  "dawn",
  "morning",
  "noon",
  "afternoon",
  "dusk",
  "night",
] as const;
export const WEATHERS = [
  "clear",
  "cloudy",
  "rain",
  "storm",
  "snow",
  "fog",
] as const;

export type Base = (typeof BASES)[number];
export type Spot = (typeof SPOTS)[number];
export type Activity = (typeof ACTIVITIES)[number];
export type TimeOfDay = (typeof TIMES)[number];
export type Weather = (typeof WEATHERS)[number];
