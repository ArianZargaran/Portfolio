import type { MetaDescriptor, MetaFunction } from "@remix-run/node";

/** Canonical production origin. Every absolute URL in meta tags (og:url,
    og:image, twitter:image) is built from this, not a relative path --
    Open Graph and Twitter Card consumers can't resolve relative URLs. */
export const SITE_URL = "https://ari.soy";

/** The single 1200x630 share image, served from /public. Declared once
    here so og:image/twitter:image and their width/height stay in sync. */
export const SOCIAL_IMAGE = {
  url: `${SITE_URL}/og.png`,
  width: 1200,
  height: 630,
};

/** Remix's documented recipe for route-level meta merging: v2's default is
    "the leaf-most route's meta export replaces the parent's entirely," so
    without this every child route meta export would silently drop root's
    shared og/twitter/description tags. Wrapping a route's meta function in
    mergeMeta folds it into the parent chain instead, by tag identity
    (name/property/title), so a route can override just `title` and inherit
    everything else from root -- one shared source, not page-by-page
    repetition. */
export function mergeMeta<
  Loader = unknown,
  ParentsLoaders extends Record<string, unknown> = Record<string, unknown>,
>(
  leafMetaFn: MetaFunction<Loader, ParentsLoaders>,
): MetaFunction<Loader, ParentsLoaders> {
  return (arg) => {
    const leafMeta = leafMetaFn(arg);
    return arg.matches.reduceRight((acc, match) => {
      const parentMeta = match.meta || [];
      for (const parentEntry of parentMeta) {
        const index = acc.findIndex(
          (entry) =>
            ("name" in entry &&
              "name" in parentEntry &&
              entry.name === parentEntry.name) ||
            ("property" in entry &&
              "property" in parentEntry &&
              entry.property === parentEntry.property) ||
            ("title" in entry && "title" in parentEntry),
        );
        if (index === -1) acc.push(parentEntry as MetaDescriptor);
      }
      return acc;
    }, leafMeta);
  };
}
