import type { LinksFunction, MetaFunction } from "react-router";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteLoaderData,
} from "react-router";

import MainMenuNav from "~/components/main-menu-nav/main-menu-nav";
import { menuOptionsFor } from "~/constants/main-menu-options";
import { DEFAULT_FEATURES, readFeatures } from "~/features";
import { useNonce } from "~/nonce";
import borderStylesheet from "~/stylesheets/border.css?url";
import colorsStylesheet from "~/stylesheets/colors.css?url";
import elevationStylesheet from "~/stylesheets/elevation.css?url";
import fontsStylesheet from "~/stylesheets/fonts.css?url";
import resetStylesheet from "~/stylesheets/reset.css?url";
import rootStylesheet from "~/stylesheets/root.css?url";
import spacingStylesheet from "~/stylesheets/spacing.css?url";
import themesStylesheet from "~/stylesheets/themes.css?url";
import { SITE_URL, SOCIAL_IMAGE } from "~/utils/seo";

const SITE_TITLE = "Arian Zargaran | Design Engineer";
const SITE_DESCRIPTION =
  "Arian Zargaran is a Design Engineer working across design systems and frontend platform engineering. 2026 Webby Awards Honoree for Best Use of AI.";

/** The single shared source for every page's social/meta tags. Individual
    routes only ever override `title` (via mergeMeta, see ~/utils/seo) --
    everything else, including og:url, is computed here once per navigation
    from `location.pathname`, so nothing is repeated page by page. */
export const meta: MetaFunction = ({ location }) => {
  const canonicalUrl = `${SITE_URL}${location.pathname}`;

  return [
    { title: SITE_TITLE },
    { name: "author", content: "Arian Zargaran" },
    { name: "description", content: SITE_DESCRIPTION },
    {
      name: "keywords",
      content:
        "Design Engineer, Design Systems, Frontend Platform, React, TypeScript, AI-powered products, Webby Awards, Arian Zargaran",
    },
    { property: "og:title", content: SITE_TITLE },
    { property: "og:description", content: SITE_DESCRIPTION },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: SOCIAL_IMAGE.url },
    { property: "og:image:width", content: String(SOCIAL_IMAGE.width) },
    { property: "og:image:height", content: String(SOCIAL_IMAGE.height) },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: SITE_TITLE },
    { name: "twitter:description", content: SITE_DESCRIPTION },
    { name: "twitter:image", content: SOCIAL_IMAGE.url },
  ];
};

/** Exposes only the feature flags (booleans) to the client. */
export const loader = () => ({ features: readFeatures() });

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: resetStylesheet },
  { rel: "stylesheet", href: fontsStylesheet },
  { rel: "stylesheet", href: colorsStylesheet },
  { rel: "stylesheet", href: spacingStylesheet },
  { rel: "stylesheet", href: themesStylesheet },
  { rel: "stylesheet", href: elevationStylesheet },
  { rel: "stylesheet", href: rootStylesheet },
  { rel: "stylesheet", href: borderStylesheet },
];

/** Maps a pathname to its page-theme class (see themes.css) so the <body>
    behind the page-enter fade always matches the page settling in, instead
    of a hardcoded theme leaking through mid-transition. `startsWith` on
    /work covers nested routes like /work/diagrams/*. */
const themeClassForPathname = (pathname: string): string => {
  if (pathname === "/about") return "about";
  if (pathname.startsWith("/work")) return "work";
  if (pathname === "/skills") return "skills";
  if (pathname === "/blog") return "blog";
  if (pathname === "/contact") return "contact";
  return "home";
};

export default function App() {
  const location = useLocation();
  const nonce = useNonce();
  // Error boundaries render without loader data; fall back to all-off.
  const features =
    useRouteLoaderData<typeof loader>("root")?.features ?? DEFAULT_FEATURES;
  const bodyThemeClass = themeClassForPathname(location.pathname);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link
          rel="apple-touch-icon"
          sizes="57x57"
          href="/apple-icon-57x57.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="60x60"
          href="/apple-icon-60x60.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="72x72"
          href="/apple-icon-72x72.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="76x76"
          href="/apple-icon-76x76.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="114x114"
          href="/apple-icon-114x114.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="120x120"
          href="/apple-icon-120x120.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="144x144"
          href="/apple-icon-144x144.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/apple-icon-152x152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-icon-180x180.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/android-icon-192x192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="96x96"
          href="/favicon-96x96.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
        <meta name="theme-color" content="#ffffff"></meta>

        <Meta />
        <Links />
      </head>
      <body className={`body ${bodyThemeClass}`}>
        <MainMenuNav options={menuOptionsFor(features)} />
        <Outlet />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}
