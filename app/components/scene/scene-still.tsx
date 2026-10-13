import { STILL_ALT, STILL_SOURCES, srcSetAttr } from "~/scene/still";

const LAPTOP = STILL_SOURCES.find((s) => s.breakpoint === "laptop")!;

/**
 * Server-rendered still of the scene (works with no JS). Each breakpoint gets
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
  return (
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
        alt={decorative ? "" : STILL_ALT}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        // React 18 doesn't know fetchPriority yet; lowercase passes through.
        {...{ fetchpriority: priority ? "high" : "auto" }}
      />
    </picture>
  );
}
