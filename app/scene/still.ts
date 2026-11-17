/**
 * The server-rendered still frame of the current scene. One composition per
 * breakpoint (laptop, tablet and mobile are separate paintings, never a
 * scaled copy of each other). Files live in public/scene/<sceneId>/.
 *
 * Laptop: the locked V12 dusk room with the polished painted character
 * (LOCK_PAINTED_CHAR_STILL_POLISH_V5, REVIEW_IN_SCENE.png). It is also the
 * reduced-motion / slow-connection fallback of the hero motion.
 * Tablet and mobile: still the v3.2 placeholder collages; scene.spec.yaml
 * has no tablet/mobile composition for the V12 room yet.
 */
export const SCENE_ID = "home-office.desk.coding.dusk.clear";
export const PLACEHOLDER_SCENE_ID = "home-office.desk.coding.dusk.clear.v3.2";

export type Breakpoint = "laptop" | "tablet" | "mobile";

export interface StillSource {
  breakpoint: Breakpoint;
  /** Media query that selects this composition (first match wins). */
  media: string;
  /** Canvas size in px (the coordinate space for hit areas). */
  width: number;
  height: number;
  srcSet: { src: string; width: number }[];
}

const dir = `/scene/${PLACEHOLDER_SCENE_ID}`;
const laptopDir = `/scene/${SCENE_ID}`;

export const STILL_SOURCES: StillSource[] = [
  {
    breakpoint: "mobile",
    media: "(max-width: 600px)",
    width: 390,
    height: 844,
    srcSet: [
      { src: `${dir}/mobile-390.webp`, width: 390 },
      { src: `${dir}/mobile-780.webp`, width: 780 },
    ],
  },
  {
    breakpoint: "tablet",
    media: "(min-width: 601px) and (max-width: 1024px)",
    width: 820,
    height: 1180,
    srcSet: [{ src: `${dir}/tablet-820.webp`, width: 820 }],
  },
  {
    breakpoint: "laptop",
    media: "(min-width: 1025px)",
    width: 1440,
    height: 900,
    srcSet: [
      { src: `${laptopDir}/laptop-960.webp`, width: 960 },
      { src: `${laptopDir}/laptop-1440.webp`, width: 1440 },
    ],
  },
];

/* One text alternative per composition: each describes the image that
   breakpoint actually shows. The laptop V12 room has no speaker (the
   Podcast hotspot sits on the navy Stanley tumbler); tablet and mobile are
   still the v3.2 placeholder collages. */
const ALT_V12_LAPTOP =
  "Painted scene at dusk: in his home office, Arian sits in a gaming chair at " +
  "his desk, headphones on, typing on a laptop beside a window onto trees in " +
  "pink evening light. On the desk: a navy tumbler, a phone on a stand and a " +
  "notebook. On the walls: a Queen concert poster, a framed, signed number 7 " +
  "jersey and a glowing bat-shaped light, above a cabinet of books, family " +
  "photos, figures and an X-Wing diorama.";

const ALT_V32_COLLAGE =
  "Painted scene at dusk: Arian sits in a red gaming chair coding at his " +
  "desk, headphones on, a city skyline glowing through the window and a bat " +
  "signal on the wall. On the desk: a laptop, a blue tumbler, a speaker, a " +
  "phone and a notebook. " +
  "Around him: a Queen concert poster, a framed number 7 jersey with photos, " +
  "and bookshelves with an X-Wing, Darth Vader, R2-D2 and other figures.";

export const STILL_ALTS: Record<Breakpoint, string> = {
  laptop: ALT_V12_LAPTOP,
  tablet: ALT_V32_COLLAGE,
  mobile: ALT_V32_COLLAGE,
};

export const srcSetAttr = (s: StillSource) =>
  s.srcSet.map((x) => `${x.src} ${x.width}w`).join(", ");
