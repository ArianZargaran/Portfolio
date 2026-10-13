import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";

import { ABOUT } from "~/content/about";

import AboutPage, { loader as aboutLoader } from "./about";
import ArticlesPage, { loader as articlesLoader } from "./articles";
import { loader as blogLoader } from "./blog";

const renderAt = async (path: string) => {
  const Stub = createRoutesStub([
    { path: "/about", Component: AboutPage, loader: aboutLoader },
    { path: "/articles", Component: ArticlesPage, loader: articlesLoader },
    { path: "/", Component: () => null },
  ]);
  render(<Stub initialEntries={[path]} />);
  await screen.findByRole("heading", { level: 1 });
};

describe("/about", () => {
  it("renders the bio and timeline from typed data in a labelled main", async () => {
    await renderAt("/about");
    const main = screen.getByRole("main", { name: "About me" });
    expect(within(main).getByText(ABOUT.bio)).toBeInTheDocument();
    const list = within(main).getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(
      ABOUT.timeline.filter((e) => e.id !== "to-be-continued").length,
    );
    expect(
      within(main).getByRole("heading", { level: 3, name: "The Amiga Years" }),
    ).toBeInTheDocument();
  });
});

describe("/articles", () => {
  it("renders the static notebook with no interactive controls", async () => {
    await renderAt("/articles");
    const main = screen.getByRole("main", { name: "Notebook" });
    expect(within(main).queryAllByRole("button")).toHaveLength(0);
    expect(within(main).queryAllByRole("textbox")).toHaveLength(0);
  });

  it("/blog 301s to /articles", () => {
    const res = blogLoader() as Response;
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("/articles");
  });
});
