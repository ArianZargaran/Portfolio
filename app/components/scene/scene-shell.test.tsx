import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";

import { HIT_OBJECTS } from "~/scene/hit-areas";

import { SceneShell } from "./scene-shell";

const mountShell = async () => {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <SceneShell /> },
  ]);
  render(<Stub initialEntries={["/"]} />);
  return screen.findAllByRole("navigation", { name: "Scene" });
};

describe("<SceneShell>", () => {
  it("renders one nav per breakpoint, each with a named link for all 7 routes", async () => {
    const navs = await mountShell();
    expect(navs).toHaveLength(3);
    for (const nav of navs) {
      const links = within(nav).getAllByRole("link");
      expect(links.map((a) => a.getAttribute("href")).sort()).toEqual(
        HIT_OBJECTS.map((o) => o.href).sort(),
      );
    }
    expect(screen.getAllByRole("link", { name: "Work" })).toHaveLength(3);
  });

  it("hides the bookshelf's extra rects (laptop photo frames, tablet lower shelf) from AT and tab order", async () => {
    await mountShell();
    const all = screen.getAllByRole("link", { hidden: true });
    const hidden = all.filter((a) => a.getAttribute("aria-hidden") === "true");
    expect(hidden).toHaveLength(2);
    for (const a of hidden) {
      expect(a).toHaveAttribute("tabindex", "-1");
      expect(a).toHaveAttribute("href", "/resume");
    }
  });

  it("server-renders the still with a text alternative", async () => {
    await mountShell();
    expect(
      screen.getByRole("img", { name: /painted scene at dusk/i }),
    ).toHaveAttribute("loading", "eager");
  });
});
