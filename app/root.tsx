import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import MainMenuNav from "~/components/main-menu-nav/main-menu-nav";
import borderStylesheet from "~/stylesheets/border.css";
import colorsStylesheet from "~/stylesheets/colors.css";
import elevationStylesheet from "~/stylesheets/elevation.css";
import fontsStylesheet from "~/stylesheets/fonts.css";
import resetStylesheet from "~/stylesheets/reset.css";
import rootStylesheet from "~/stylesheets/root.css";
import themesStylesheet from "~/stylesheets/spacing.css";
import spacingStylesheet from "~/stylesheets/themes.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: resetStylesheet },
  { rel: "stylesheet", href: fontsStylesheet },
  { rel: "stylesheet", href: colorsStylesheet },
  { rel: "stylesheet", href: themesStylesheet },
  { rel: "stylesheet", href: spacingStylesheet },
  { rel: "stylesheet", href: elevationStylesheet },
  { rel: "stylesheet", href: rootStylesheet },
  { rel: "stylesheet", href: borderStylesheet },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Arian Zargaran | Front-End Engineer</title>
        <meta name="author" content="Arian Zargaran" />
        <meta
          name="description"
          content="Arian Zargaran's portfolio showcases innovative Front-End development projects, skills in React, TypeScript, and Framer Motion, and a user-centered design approach."
        />
        <meta
          name="keywords"
          content="Front-End Developer, React, TypeScript, Framer Motion, Web Development Portfolio, UI/UX Design, Arian Zargaran"
        />
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
      <body className="body pure">
        <MainMenuNav
          options={[
            {
              id: "ID1",
              option: "Home",
              caption: "Turning Interfaces into Experiences.",
              href: "/",
              theme: "pure",
            },
            {
              id: "ID2",
              option: "About",
              caption: "Passion, Experience, and Commitment.",
              href: "/about-me",
              theme: "french",
            },
            {
              id: "ID3",
              option: "Projects",
              caption: "Thoughts go LIVE: My code in action.",
              href: "/projects",
              theme: "royal",
            },
            {
              id: "ID4",
              option: "Skills",
              caption: "Tools and Tech to deliver excellence.",
              href: "/skills",
              theme: "oxford",
            },
            {
              id: "ID5",
              option: "Blog",
              caption: "Insights, one line of code at a time.",
              href: "/blog",
              theme: "mirage",
            },
            {
              id: "ID6",
              option: "Contact",
              caption: "Let's build something together!",
              href: "/contact",
              theme: "stratos",
            },
          ]}
        />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
