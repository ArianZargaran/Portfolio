/**
 * How Dusk's HOTSPOT_BOXES_*.json maps onto the app's laptop hit areas.
 * Atlas's decisions (Nov 17 2026, accepting Dusk's t995 recommendations) are
 * encoded here as data, so a new box file is a pure data drop:
 *
 *   1. The laptop hit area is `laptop.screen_lid`; the full body is reference only.
 *   2. T6 (podcast) and the mug sip both sit on the navy Stanley: V12 has no
 *      speaker. The S4 sip is timer-only, so `mug-sip` gets no hit box.
 *   3. Phone stacks above notebook.
 *   4. The bookshelf is 3 cabinet boxes plus the photo frames on top; the
 *      jersey frame opens nothing (it must not touch any hit box).
 *
 * Ids are the app's hotspot ids (`data-object`, triggers, the E2 egg), which
 * mirror graph.yaml routes.map. Anything that doesn't is listed in
 * GRAPH_PROPOSALS for Atlas; graph.yaml itself is never edited from here.
 */

/** routes.map (graph.yaml), home-office objects, verbatim. */
export const GRAPH_ROUTE_OBJECTS = {
  "/about": "Queen poster",
  "/case-studies": "Lego figure",
  "/podcast": "pair of speakers",
  "/articles": "notebook/journal on the desk",
  "/work": "laptop",
  "/resume": "bookshelf",
  "/contact": "phone",
} as const;

export type GraphRoute = keyof typeof GRAPH_ROUTE_OBJECTS;

/** Where an app hotspot's laptop rects come from in a box file. */
export type BoxSource =
  /** The hotspot's own `hit_xyxy`. */
  | { kind: "hit"; box: string }
  /** One named sub-box's `hit` (an [x, y, w, h] box). */
  | { kind: "sub"; box: string; sub: string }
  /** Several named parts of the hotspot's `rects[]`, in this order. The
      first is the focusable rect; the rest are pointer-only. */
  | { kind: "parts"; box: string; parts: readonly string[] };

export interface HotspotMapEntry {
  /** App hotspot id (hit-areas.ts, triggers, egg). */
  id: string;
  route: GraphRoute;
  source: BoxSource;
  /** Graph object the hotspot stands for, when it differs from routes.map. */
  graphObject?: string;
}

export const HOTSPOT_MAP: readonly HotspotMapEntry[] = [
  {
    id: "bookshelf",
    route: "/resume",
    // Decision 4. Lower tier first: it is the focusable rect and the zoom origin.
    source: {
      kind: "parts",
      box: "bookshelf",
      parts: [
        "lower_tier_and_base",
        "middle_tier",
        "hutch",
        "photo_frames_on_top",
      ],
    },
  },
  {
    id: "lego",
    route: "/case-studies",
    source: { kind: "hit", box: "lego" },
    graphObject: "X-Wing diorama bay (stands in for the Lego figure)",
  },
  {
    id: "queen-poster",
    route: "/about",
    source: { kind: "hit", box: "queen-poster" },
  },
  {
    id: "laptop",
    route: "/work",
    // Decision 1.
    source: { kind: "sub", box: "laptop", sub: "screen_lid" },
  },
  {
    id: "notebook",
    route: "/articles",
    source: { kind: "hit", box: "notebook" },
  },
  {
    id: "phone",
    route: "/contact",
    source: { kind: "hit", box: "phone" },
  },
  {
    id: "speakers",
    route: "/podcast",
    // Decision 2: the box file's `speakers` entry is drawn on the Stanley.
    source: { kind: "hit", box: "speakers" },
    graphObject: "navy Stanley tumbler (scene.object-d8-stanley)",
  },
];

/** Box-file hotspots that must NOT get a hit area (decision 2: S4 is timer-only). */
export const NO_HIT_BOXES = ["mug-sip"] as const;

/** Box-file entries that are reference geometry only (not hotspots). */
export const REFERENCE_BOXES = ["character"] as const;

/** Informational boxes no hit area may touch (decision 4: the jersey opens nothing). */
export const MUST_STAY_CLEAR = ["jersey-frame"] as const;

/**
 * Stacking rules (later wins), checked against the file's hit order.
 * [lower, upper]: `upper` must come after `lower`.
 */
export const STACKING_RULES: readonly (readonly [string, string])[] = [
  ["bookshelf", "lego"], // lego sits inside the cabinet
  ["notebook", "phone"], // decision 3
  ["laptop", "notebook"],
  ["laptop", "phone"],
  ["laptop", "speakers"],
];

/** Fallback hit order when a file has no `hit_order` (v1). */
export const DEFAULT_HIT_ORDER = HOTSPOT_MAP.map((e) => e.id);

/**
 * Ids and names that don't match graph.yaml routes.map. Proposals for Atlas,
 * not graph edits; the app keeps its current ids until Atlas rules.
 */
export const GRAPH_PROPOSALS: readonly {
  id: string;
  issue: string;
  proposal: string;
}[] = [
  {
    id: "speakers",
    issue:
      'routes.map /podcast says "pair of speakers" (home-office), but V12 has no speaker; the hit box is on the navy Stanley (scene.object-d8-stanley).',
    proposal:
      'Change routes.map /podcast home-office to the navy Stanley tumbler. Decide whether the hotspot id becomes "stanley". The app keeps "speakers" until then; a rename touches this map, HOTSPOT_REACTIONS ("speakers" -> speaker) and the E2 egg sequence ["queen-poster", "speakers"].',
  },
  {
    id: "lego",
    issue:
      'routes.map /case-studies says "Lego figure"; V12 has an X-Wing diorama bay in the cabinet instead.',
    proposal:
      'Record the diorama bay as the home-office /case-studies object (id can stay "lego").',
  },
  {
    id: "mug-sip",
    issue:
      "Box-file id, not in graph.yaml; the motion overlay calls it motion.elements.tumbler_sip. It has no hit box.",
    proposal:
      "None needed for the app (no hotspot). Optional: name it tumbler_sip in future box files.",
  },
  {
    id: "jersey-frame",
    issue:
      "Not in routes.map. It no longer opens /resume (it never had its own rect; the old bookshelf box overlapped it).",
    proposal:
      "Optional: note in routes.map that the jersey frame is decorative.",
  },
];
