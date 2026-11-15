import { STILL_ALTS, STILL_SOURCES, srcSetAttr } from "~/scene/still";

const LAPTOP = STILL_SOURCES.find((s) => s.breakpoint === "laptop")!;

/**
 * Server-rendered still of the scene (works with no JS).
 *
 * <picture> can only carry one alt, but each breakpoint shows a different
 * painting. So the <img> itself is presentational and, unless decorative,
 * one role="img" label per breakpoint sits over it; scene.css shows only
 * the one whose media query matches (display: none removes the others from
 * the accessibility tree), so AT always hears the image on screen. Each breakpoint gets
 * its own composition via <picture>; the box reserves its aspect ratio per
 * breakpoint in scene.css so nothing shifts when the image (or later the
 * three.js canvas) arrives.
 */
export function SceneStill({
  decorative = false,
  priority = false,
}: {
  /** True when a nearby text alternative already describes the scene. */
  decorative?: boolean;
  /** LCP image: load eagerly with high fetch priority. */
  priority?: boolean;
}) {
  const picture = (
    <picture className="scene-still_picture">
      {STILL_SOURCES.filter((s) => s !== LAPTOP).map((s) => (
        <source
          key={s.breakpoint}
          media={s.media}
          srcSet={srcSetAttr(s)}
          sizes="100vw"
          width={s.width}
          height={s.height}
          type="image/webp"
        />
      ))}
      <img
        className="scene-still_img"
        src={LAPTOP.srcSet[LAPTOP.srcSet.length - 1].src}
        srcSet={srcSetAttr(LAPTOP)}
        sizes="100vw"
        width={LAPTOP.width}
        height={LAPTOP.height}
        alt=""
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        // React 18 doesn't know fetchPriority yet; lowercase passes through.
        {...{ fetchpriority: priority ? "high" : "auto" }}
      />
    </picture>
  );
  if (decorative) return picture;
  return (
    <>
      {picture}
      {STILL_SOURCES.map((s) => (
        <span
          key={s.breakpoint}
          role="img"
          aria-label={STILL_ALTS[s.breakpoint]}
          className={`scene-still_alt scene-still_alt--${s.breakpoint}`}
          data-breakpoint={s.breakpoint}
        />
      ))}
    </>
  );
}
