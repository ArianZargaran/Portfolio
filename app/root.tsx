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
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="body pure">
        <MainMenuNav
          options={[
            {
              // TODO: Update routes
              id: "ID6",
              option: "Contact",
              caption: "Caption",
              href: "/contact",
              theme: "stratos",
            },
            {
              id: "ID5",
              option: "Blog",
              caption: "Caption",
              href: "/blog",
              theme: "mirage",
            },
            {
              id: "ID4",
              option: "Skills",
              caption: "Caption",
              href: "/skills",
              theme: "oxford",
            },
            {
              id: "ID3",
              option: "Projects",
              caption: "Caption",
              href: "/projects",
              theme: "royal",
            },
            {
              id: "ID2",
              option: "About me",
              caption: "Caption",
              href: "/about-me",
              theme: "french",
            },
            {
              id: "ID1",
              option: "Home",
              caption: "Turning Interfaces into Experiences",
              href: "/",
              theme: "pure",
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
