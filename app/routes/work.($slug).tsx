import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction, MetaFunction } from "@remix-run/node";
import { Link, useLocation, useNavigate, useParams } from "@remix-run/react";
import { useCallback } from "react";

import { GridWarp } from "~/components/backgrounds/grid-warp/grid-warp";
import { Isotype } from "~/components/icons/isotype/isotype";
import { WorkGrid } from "~/components/work/work-grid";
import { ALL_WORK_CARDS, ID_TO_SLUG, SLUG_TO_ID } from "~/constants/work-cards";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import work from "~/stylesheets/work.css";
import { mergeMeta } from "~/utils/seo";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: work },
];

/* Optional segment (`($slug)`) so one route module serves both the index
   (/work) and every case study (/work/<slug>) — required for requirement 3:
   opening a card from the index must update the URL via client-side
   navigation, not a route/module swap, or the grid (and its choreography
   state) would remount from scratch on every open/close.

   Per-card title/og:title/og:description only — og:url is already correct
   here for free (root's meta computes it from `location.pathname` for every
   route), and og:image/twitter:card are inherited via mergeMeta untouched,
   per this morning's fix. An unrecognized or absent slug returns no
   overrides at all, so the bare /work behavior is exactly what it was
   before this route had a meta export. */
export const meta: MetaFunction = mergeMeta(({ params }) => {
  const card = params.slug
    ? ALL_WORK_CARDS.find((c) => c.slug === params.slug)
    : undefined;
  if (!card) return [];

  const title = `${card.eyebrow} — Arian Zargaran`;
  return [
    { title },
    { property: "og:title", content: title },
    { property: "og:description", content: card.signal },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: card.signal },
  ];
});

const WorkPage = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  /* null (not undefined) once routing is confirmed in play — see the
     three-state contract on WorkGridProps.routeOpenId in work-grid.tsx. An
     unrecognized slug in the URL resolves the same as no slug: nothing
     forced open, same graceful fallback as an invalid link anywhere else
     on the web. */
  const routeOpenId = slug ? (SLUG_TO_ID[slug] ?? null) : null;

  const handleOpenIdChange = useCallback(
    (id: string | undefined) => {
      const targetSlug = id ? ID_TO_SLUG[id] : undefined;
      const targetPath = targetSlug ? `/work/${targetSlug}` : "/work";
      if (location.pathname === targetPath) return;
      navigate(targetPath, { preventScrollReset: true });
    },
    [location.pathname, navigate],
  );

  return (
    <section className="page work work-page">
      <GridWarp />
      <header className="work-header">
        <Link className="work-header-heading" to="/">
          <Isotype width={48} height="auto" />
          <h1>Work</h1>
        </Link>
      </header>
      <article className="work-article">
        <WorkGrid
          routeOpenId={routeOpenId}
          onOpenIdChange={handleOpenIdChange}
        />
      </article>
    </section>
  );
};

export default WorkPage;
