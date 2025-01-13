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
