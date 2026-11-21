import type { Breakpoint } from "~/scene/still";

import { LAPTOP_HIT_ORDER, LAPTOP_RECTS } from "./hotspots/laptop.generated";

/** [x1, y1, x2, y2] in the breakpoint's canvas px (see STILL_SOURCES). */
export type Rect = [number, number, number, number];

export interface HitObject {
  /** Scene object id (graph.yaml vocabulary). */
  id: string;
  /** Accessible name of the link. */
  label: string;
  href: string;
  /** Per breakpoint; the first rect is the focusable one, extras are
      pointer-only (aria-hidden, tabIndex -1). */
  rects: Record<Breakpoint, Rect[]>;
  /** Breakpoints whose rects are hand estimates, not measured from layers.
      Atlas: keep for launch, replace when design supplies real boxes. */
  estimated?: Breakpoint[];
  /** Design entities the object is drawn from (layer card names), so a
      layer rebuild can be traced to the hit areas it affects. */
  entities?: string[];
}

/** Layer 6 bookshelf v1 (designs/…v3.2/layers/layer06_bookshelf_v1/
    piece.json) retired the old 50_hot_lego / bookshelf / 20_room_shelf-*
    cards. Shelf, books and collectibles are now separate entities. */
export const LAYER06 = "layer06_bookshelf_v1";

/** Measured laptop rects for a hotspot (Dusk's box file via the importer). */
const measured = (id: string): Rect[] => {
  const r = LAPTOP_RECTS[id];
  if (!r?.length) throw new Error(`no measured laptop rects for "${id}"`);
  return r;
};

/**
 * Object → route map.
 *
 * Laptop rects are MEASURED on the V12 dusk still: they are generated from
 * Dusk's HOTSPOT_BOXES_t995_v2.json by scripts/hotspots/import-hotspots.mjs
 * (hotspots/laptop.generated.ts, decisions in hotspots/mapping.ts). The
 * X-Wing diorama bay stands in for the Lego (/case-studies) and the podcast
 * hotspot is Ari's on-head `headphones` (a local rect: the box file has no
 * headphones box). Tablet/mobile boxes are unmeasured and still belong to
 * the v3.2 placeholder collages.
 *
 * DOM order = tab order (and the zoom/deep-link lookup order). Stacking is
 * per breakpoint (HIT_STACK, applied as z-index): later wins, so Lego
 * (inside the bookshelf box) sits above the bookshelf and the phone above
 * the notebook.
 */
export const HIT_OBJECTS: HitObject[] = [
  {
    id: "laptop",
    label: "Work",
    href: "/work",
    rects: {
      laptop: measured("laptop"),
      tablet: [[408, 803, 539, 937]],
      mobile: [[225, 636, 298, 710]],
    },
  },
  {
    id: "queen-poster",
    label: "About me",
    href: "/about",
    rects: {
      laptop: measured("queen-poster"),
      tablet: [[578, 506, 742, 808]],
      mobile: [[12, 22, 100, 187]],
    },
    estimated: ["tablet", "mobile"],
  },
  {
    id: "bookshelf",
    label: "Resume",
    href: "/resume",
    /* Laptop: 3 cabinet boxes (lower tier + base first: focusable and the
       zoom origin), then the photo frames on top and the left-plinth sliver
       (local override, hotspots/mapping.ts). The jersey frame beside
       the shelf is not part of it and opens nothing. Tablet/mobile: old
       layout json. */
    rects: {
      laptop: measured("bookshelf"),
      tablet: [
        [511, 84, 802, 417],
        [681, 760, 820, 1180],
      ],
      mobile: [[143, 278, 380, 463]],
    },
    /* Every shelf entity except the Lego minifig opens /resume. */
    entities: [
      `${LAYER06}/shelf.frame`,
      `${LAYER06}/shelf.interior`,
      `${LAYER06}/shelf_books.upper_left`,
      `${LAYER06}/shelf_books.top`,
      `${LAYER06}/shelf_books.lower_left`,
      `${LAYER06}/shelf_books.bottom`,
      `${LAYER06}/item.xwing`,
      `${LAYER06}/item.vader`,
      `${LAYER06}/item.r2d2`,
      `${LAYER06}/item.hero_cap`,
      `${LAYER06}/item.hero_glasses`,
      `${LAYER06}/item.hero_top`,
      `${LAYER06}/item.photo_a`,
      `${LAYER06}/item.photo_b`,
      `${LAYER06}/item.shelf_lamp`,
    ],
    estimated: ["tablet", "mobile"],
  },
  {
    id: "lego",
    label: "Case studies",
    href: "/case-studies",
    /* Laptop: the X-Wing diorama bay. Tablet/mobile: old layout json
       (drawn from the retired 50_hot_lego card). */
    rects: {
      laptop: measured("lego"),
      tablet: [[762, 930, 805, 1004]],
      mobile: [[189, 370, 212, 411]],
    },
    entities: [`${LAYER06}/item.lego`],
    estimated: ["tablet", "mobile"],
  },
  {
    id: "phone",
    label: "Contact",
    href: "/contact",
    rects: {
      laptop: measured("phone"),
      tablet: [[266, 834, 312, 899]],
      mobile: [[147, 653, 172, 689]],
    },
  },
  {
    id: "notebook",
    label: "Notebook",
    href: "/articles",
    rects: {
      laptop: measured("notebook"),
      tablet: [[407, 927, 524, 971]],
      mobile: [[224, 705, 289, 728]],
    },
  },
  {
    /* Ari's on-head headphones (Nov 21 2026, t1034u): the T6 groove and
       podcast hotspot, moved off the navy Stanley. Laptop: a local rect
       (hotspots/mapping.ts). Tablet/mobile: by eye on the v3.2 placeholder
       stills (headband + near ear cup). Tablet is 61 px wide so it stays
       >= 44 CSS px at the narrowest tablet width (601 / 820 scale; review
       N7: it was 56 -> 41 px). */
    id: "headphones",
    label: "Podcast (headphones)",
    href: "/podcast",
    rects: {
      laptop: measured("headphones"),
      tablet: [[166, 632, 227, 750]],
      mobile: [[88, 540, 132, 604]],
    },
    estimated: ["tablet", "mobile"],
  },
];

/**
 * Stacking order per breakpoint, later wins (rendered as z-index so the DOM
 * and tab order stay HIT_OBJECTS). Laptop: the box file's hit order.
 * Tablet/mobile: unchanged, the HIT_OBJECTS order.
 */
export const HIT_STACK: Record<Breakpoint, readonly string[]> = {
  laptop: LAPTOP_HIT_ORDER,
  tablet: HIT_OBJECTS.map((o) => o.id),
  mobile: HIT_OBJECTS.map((o) => o.id),
};

/** z-index (1-based) of a hotspot on a breakpoint. */
export const stackIndex = (bp: Breakpoint, id: string) =>
  HIT_STACK[bp].indexOf(id) + 1;

/** Rect → % box relative to a canvas, for absolutely positioned links. */
export const rectToPercent = (
  [x1, y1, x2, y2]: Rect,
  width: number,
  height: number,
) => ({
  left: `${((x1 / width) * 100).toFixed(3)}%`,
  top: `${((y1 / height) * 100).toFixed(3)}%`,
  width: `${(((x2 - x1) / width) * 100).toFixed(3)}%`,
  height: `${(((y2 - y1) / height) * 100).toFixed(3)}%`,
});

/** Scene object a pathname is "zoomed" to on a deep link (prefix match). */
export const focusForPath = (pathname: string): HitObject | undefined =>
  HIT_OBJECTS.find(
    (o) => pathname === o.href || pathname.startsWith(`${o.href}/`),
  );

/** transform-origin (% of canvas) centred on an object's first rect. */
export const zoomOrigin = ([x1, y1, x2, y2]: Rect, w: number, h: number) =>
  `${(((x1 + x2) / 2 / w) * 100).toFixed(2)}% ${(((y1 + y2) / 2 / h) * 100).toFixed(2)}%`;
