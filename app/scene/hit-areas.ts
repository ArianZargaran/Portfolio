import type { Breakpoint } from "~/scene/still";

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

/**
 * Laptop rects are hand estimates on the V12 dusk still (feat/hero-scene):
 * the room was re-laid out (poster beside the jersey, cabinet with an
 * X-Wing diorama instead of the Lego shelf, speaker left of the laptop), so
 * the v3.2 laptop boxes no longer applied. Every object is marked
 * `estimated` on laptop until Dusk supplies measured V12 boxes. The X-Wing
 * diorama stands in for the Lego (/case-studies). Tablet/mobile boxes still
 * belong to the v3.2 placeholder collages.
 *
 * Object → route map. DOM order = tab order and stacking
 * order: later entries sit on top, so Lego (inside the bookshelf box) comes
 * after the bookshelf and wins where they overlap.
 * Laptop boxes: layer alpha bounds (bookshelf and Lego: layer 6 entities). Tablet/mobile: layout json, except the
 * poster (the layout has no poster box, only the old framed_photo).
 */
export const HIT_OBJECTS: HitObject[] = [
  {
    id: "laptop",
    label: "Work",
    href: "/work",
    rects: {
      laptop: [[452, 425, 632, 588]],
      tablet: [[408, 803, 539, 937]],
      mobile: [[225, 636, 298, 710]],
    },
    estimated: ["laptop"],
  },
  {
    id: "queen-poster",
    label: "About me",
    href: "/about",
    rects: {
      laptop: [[656, 84, 780, 410]],
      tablet: [[578, 506, 742, 808]],
      mobile: [[12, 22, 100, 187]],
    },
    estimated: ["laptop", "tablet", "mobile"],
  },
  {
    id: "bookshelf",
    label: "Resume",
    href: "/resume",
    /* Laptop: layer 6 canvas_bbox of shelf.frame (clamped to the canvas)
       plus the photo frames standing on top. Tablet/mobile: old layout json. */
    rects: {
      laptop: [
        [883, 274, 1438, 858],
        [1040, 210, 1255, 282],
      ],
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
    // Until Dusk delivers real boxes for the layer 6 entities.
    estimated: ["laptop", "tablet", "mobile"],
  },
  {
    id: "lego",
    label: "Case studies",
    href: "/case-studies",
    /* Laptop: layer 6 canvas_bbox of item.lego. Tablet/mobile: old
       layout json (drawn from the retired 50_hot_lego card). */
    rects: {
      laptop: [[1088, 555, 1372, 705]],
      tablet: [[762, 930, 805, 1004]],
      mobile: [[189, 370, 212, 411]],
    },
    entities: [`${LAYER06}/item.lego`],
    // Until Dusk delivers real boxes for the layer 6 entities.
    estimated: ["laptop", "tablet", "mobile"],
  },
  {
    id: "phone",
    label: "Contact",
    href: "/contact",
    rects: {
      laptop: [[640, 475, 708, 584]],
      tablet: [[266, 834, 312, 899]],
      mobile: [[147, 653, 172, 689]],
    },
    estimated: ["laptop"],
  },
  {
    id: "notebook",
    label: "Notebook",
    href: "/articles",
    rects: {
      laptop: [[568, 588, 706, 622]],
      tablet: [[407, 927, 524, 971]],
      mobile: [[224, 705, 289, 728]],
    },
    estimated: ["laptop"],
  },
  {
    id: "speakers",
    label: "Podcast",
    href: "/podcast",
    rects: {
      laptop: [[408, 445, 450, 540]],
      tablet: [[593, 837, 662, 927]],
      mobile: [[327, 655, 366, 705]],
    },
    estimated: ["laptop"],
  },
];

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
