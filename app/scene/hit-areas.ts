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
}

/**
 * Object → route map for the v3.2 still. DOM order = tab order and stacking
 * order: later entries sit on top, so Lego (inside the bookshelf box) comes
 * after the bookshelf and wins where they overlap.
 * Laptop boxes: layer alpha bounds. Tablet/mobile: layout json, except the
 * poster (the layout has no poster box, only the old framed_photo).
 */
export const HIT_OBJECTS: HitObject[] = [
  {
    id: "laptop",
    label: "Work",
    href: "/work",
    rects: {
      laptop: [[523, 411, 697, 563]],
      tablet: [[408, 803, 539, 937]],
      mobile: [[225, 636, 298, 710]],
    },
  },
  {
    id: "queen-poster",
    label: "About me",
    href: "/about",
    rects: {
      laptop: [[749, 21, 963, 420]],
      tablet: [[578, 506, 742, 808]],
      mobile: [[12, 22, 100, 187]],
    },
    estimated: ["tablet", "mobile"],
  },
  {
    id: "bookshelf",
    label: "Resume",
    href: "/resume",
    rects: {
      laptop: [[867, 213, 1440, 900]],
      tablet: [
        [511, 84, 802, 417],
        [681, 760, 820, 1180],
      ],
      mobile: [[143, 278, 380, 463]],
    },
  },
  {
    id: "lego",
    label: "Case studies",
    href: "/case-studies",
    rects: {
      laptop: [[968, 583, 1048, 679]],
      tablet: [[762, 930, 805, 1004]],
      mobile: [[189, 370, 212, 411]],
    },
  },
  {
    id: "phone",
    label: "Contact",
    href: "/contact",
    rects: {
      laptop: [[339, 442, 404, 544]],
      tablet: [[266, 834, 312, 899]],
      mobile: [[147, 653, 172, 689]],
    },
  },
  {
    id: "notebook",
    label: "Notebook",
    href: "/articles",
    rects: {
      laptop: [[451, 559, 694, 622]],
      tablet: [[407, 927, 524, 971]],
      mobile: [[224, 705, 289, 728]],
    },
  },
  {
    id: "speakers",
    label: "Podcast",
    href: "/podcast",
    rects: {
      laptop: [[772, 454, 858, 565]],
      tablet: [[593, 837, 662, 927]],
      mobile: [[327, 655, 366, 705]],
    },
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
