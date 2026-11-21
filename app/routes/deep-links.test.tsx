import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";

import { focusForPath, HIT_OBJECTS } from "~/scene/hit-areas";

import AboutPage, { loader as aboutLoader } from "./about";
import ArticlesPage, { loader as articlesLoader } from "./articles";
import CaseStudiesPage, { loader as caseLoader } from "./case-studies._index";
import BrandkitPage, {
  loader as brandkitLoader,
} from "./case-studies.brandkit._index";
import ContactPage, { loader as contactLoader } from "./contact";
import PodcastPage, { loader as podcastLoader } from "./podcast";
import ResumePage, { loader as resumeLoader } from "./resume";

const ROUTES = [
  {
    path: "/resume",
    Component: ResumePage,
    loader: resumeLoader,
    h1: "Resume",
    object: "bookshelf",
  },
  {
    path: "/contact",
    Component: ContactPage,
    loader: contactLoader,
    h1: /./,
    object: "phone",
  },
  {
    path: "/about",
    Component: AboutPage,
    loader: aboutLoader,
    h1: "About me",
    object: "queen-poster",
  },
  {
    path: "/articles",
    Component: ArticlesPage,
    loader: articlesLoader,
    h1: "Notebook",
    object: "notebook",
  },
  {
    path: "/podcast",
    Component: PodcastPage,
    loader: podcastLoader,
    h1: "Podcast",
    object: "headphones",
  },
  {
    path: "/case-studies",
    Component: CaseStudiesPage,
    loader: caseLoader,
    h1: "Case studies",
    object: "lego",
  },
  {
    path: "/case-studies/brandkit",
    Component: BrandkitPage,
    loader: brandkitLoader,
    h1: "Brandkit",
    object: "lego",
  },
];

describe("deep links load each route's content", () => {
  it.each(ROUTES)(
    "$path renders its loader content zoomed on $object",
    async ({ path, h1, object }) => {
      const Stub = createRoutesStub([
        ...ROUTES.map(({ path: p, Component, loader }) => ({
          path: p,
          Component,
          loader,
        })),
        { path: "/", Component: () => null },
      ]);
      render(<Stub initialEntries={[path]} />);
      const heading = await screen.findByRole("heading", {
        level: 1,
        name: h1,
      });
      expect(screen.getByRole("main")).toContainElement(heading);
      // The still is zoomed on this route's object, which is marked current.
      for (const nav of screen.getAllByRole("navigation", { name: "Scene" })) {
        const current = within(nav).getByRole("link", { current: "page" });
        expect(current).toHaveAttribute("data-object", object);
      }
    },
  );

  it("maps /work deep links and nested paths to their objects", () => {
    expect(focusForPath("/work/motion")?.id).toBe("laptop");
    expect(focusForPath("/case-studies/brandkit/theming")?.id).toBe("lego");
    expect(focusForPath("/")).toBeUndefined();
    expect(focusForPath("/workshop")).toBeUndefined();
    expect(new Set(HIT_OBJECTS.map((o) => focusForPath(o.href)?.id)).size).toBe(
      7,
    );
  });
});
