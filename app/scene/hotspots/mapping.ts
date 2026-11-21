/**
 * How Dusk's HOTSPOT_BOXES_*.json maps onto the app's laptop hit areas.
 * Atlas's decisions (Nov 17 2026, accepting Dusk's t995 recommendations) are
 * encoded here as data, so a new box file is a pure data drop:
 *
 *   1. The laptop hit area is `laptop.screen_lid`; the full body is reference only.
 *   2. The mug sip sits on the navy Stanley and is timer-only, so `mug-sip`
 *      gets no hit box. T6 (podcast) was on the Stanley too (`speakers`);
 *      since Nov 21 2026 it is on Ari's on-head headphones (a local rect,
 *      SUPERSEDED_BOXES).
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
  | { kind: "parts"; box: string; parts: readonly string[] }
  /** Not in the box file: one rect measured locally (exclusive xyxy,
      1440x900 composition px), with its provenance. Focusable. */
  | {
      kind: "local";
      rect: readonly [number, number, number, number];
      name: string;
      why: string;
    };

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
    /* Ari, Nov 21 2026 (via Atlas, t1034u): the T6 groove / podcast
       hotspot moves from the navy Stanley (the box file's `speakers`) to
       his on-head headphones. Not in HOTSPOT_BOXES_t995_v2, so the rect is
       local: measured on the V12 dusk still (public/scene/…/laptop-1440.webp)
       around the headband (from x 300, y 305) and both ear cups (near cup
       x 313-348, y 363-406; far cup x 250-262, y 370-400), padded ~4 px so
       the head bob stays inside: [246, 298, 356, 410] = 110 x 112 px (>= 44).
       It sits on the character (reference geometry) and clears every other
       hit box; it stacks on top. */
    id: "headphones",
    route: "/podcast",
    source: {
      kind: "local",
      rect: [246, 298, 356, 410],
      name: "on_head",
      why: "Ari moved the T6 / podcast hotspot to his headphones (t1034u)",
    },
    graphObject: "Ari's on-head headphones (character layer)",
  },
];

/**
 * Box-file hotspots replaced by a local one: `speakers` (drawn on the navy
 * Stanley) gave way to the on-head headphones (Ari, Nov 21 2026). The
 * importer ignores them (with a warning) in the hotspots and hit order.
 */
export const SUPERSEDED_BOXES = ["speakers"] as const;

/**
 * Local rects added on top of a box file (not in Dusk's JSON). Appended after
 * the object's file rects, always pointer-only (aria-hidden, tabIndex -1).
 * `minSideExempt`: the 44 px minimum is a target-size rule for focusable
 * hit areas; a pointer-only sliver attached to a large object may be thinner.
 */
export interface LocalExtraRect {
  id: string;
  /** [x1, y1, x2, y2] exclusive, 1440x900 composition px. */
  rect: readonly [number, number, number, number];
  name: string;
  why: string;
  minSideExempt?: boolean;
}

export const LOCAL_EXTRA_RECTS: readonly LocalExtraRect[] = [
  {
    id: "bookshelf",
    // Dusk's optional 5th rect from HOTSPOT_BOXES_t995_v2 / review_t995_hotspots_v2
    // item 1, given there as [x, y, w, h] = [879, 672, 34, 145]. Approved by
    // Atlas (Nov 17 2026) as x1,y1,x2,y2 [879, 672, 913, 817]. Covers the
    // left-projecting plinth corner and left leg (part of the 6,755 px of
    // shelf content outside the v2 union). 308 px below the jersey hit box.
    rect: [879, 672, 913, 817],
    name: "left_plinth",
    why: "Dusk's optional 5th bookshelf rect, approved by Atlas",
    minSideExempt: true,
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
  ["laptop", "headphones"],
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
    id: "headphones",
    issue:
      'routes.map /podcast says "pair of speakers" (home-office), but V12 has no speaker. The hotspot was on the navy Stanley; Ari moved it to his on-head headphones (Nov 21 2026, t1034u).',
    proposal:
      'Change routes.map /podcast home-office to "Ari\'s on-head headphones" (hotspot id "headphones"; the T6 groove trigger and the E2 egg sequence ["queen-poster", "headphones"]).',
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
