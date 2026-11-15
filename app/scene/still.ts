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

export const STILL_ALT =
  "Painted scene at dusk: Arian types on a laptop at a standing desk in his " +
  "home office, headphones on, beside a window onto trees in pink evening " +
  "light. Around him: a phone on a stand, a notebook, a speaker, a Queen " +
  "concert poster, a framed number 7 jersey, a glowing bat lamp and a " +
  "cabinet of books, figures and an X-Wing diorama.";

export const srcSetAttr = (s: StillSource) =>
  s.srcSet.map((x) => `${x.src} ${x.width}w`).join(", ");
