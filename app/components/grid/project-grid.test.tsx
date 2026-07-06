import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectsGrid } from "./project-grid";

describe("ProjectsGrid", () => {
  it("renders 7 project tiles", () => {
    render(<ProjectsGrid />);
    const tiles = screen.getAllByRole("button", { name: /project tile/i });
    expect(tiles).toHaveLength(7);
  });

  it("renders 3 rows", () => {
    render(<ProjectsGrid />);
    expect(screen.getAllByTestId("projects-row")).toHaveLength(3);
  });

  it("keeps a placeholder tile in the grid for topics with no images yet", () => {
    render(<ProjectsGrid />);
    expect(
      screen.getByRole("button", { name: /expand back-end and infra project tile/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand mobile apps project tile/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /expand ai implementations, automations project tile/i,
      }),
    ).toBeInTheDocument();
  });

  it("each tile has a unique expand aria-label per topic", () => {
    render(<ProjectsGrid />);
    expect(
      screen.getByRole("button", { name: /expand design systems project tile/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /expand product front-end engineering project tile/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /expand non-technical \(linguistic\) qa project tile/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand own designs project tile/i }),
    ).toBeInTheDocument();
  });

  it("clicking a tile marks it active and adds has-active to grid + is-active-row to its row", () => {
    render(<ProjectsGrid />);
    const grid = screen.getByTestId("projects-grid");

    expect(grid).not.toHaveClass("has-active");

    fireEvent.click(
      screen.getByRole("button", { name: /expand design systems project tile/i }),
    );

    expect(grid).toHaveClass("has-active");
    const rows = screen.getAllByTestId("projects-row");
    expect(rows[0]).toHaveClass("is-active-row");
    expect(rows[0]).toHaveClass("row-0");
  });

  it("clicking the active tile again keeps it active", () => {
    render(<ProjectsGrid />);
    const grid = screen.getByTestId("projects-grid");

    fireEvent.click(
      screen.getByRole("button", {
        name: /expand product front-end engineering project tile/i,
      }),
    );
    expect(grid).toHaveClass("has-active");

    fireEvent.click(
      screen.getByRole("button", {
        name: /product front-end engineering project tile, expanded/i,
      }),
    );
    expect(grid).toHaveClass("has-active");
  });

  it("mousedown outside any tile deactivates the active tile", () => {
    render(<ProjectsGrid />);
    const grid = screen.getByTestId("projects-grid");

    fireEvent.click(
      screen.getByRole("button", {
        name: /expand product front-end engineering project tile/i,
      }),
    );
    expect(grid).toHaveClass("has-active");

    fireEvent.mouseDown(document.body);
    expect(grid).not.toHaveClass("has-active");
  });

  it("mousedown inside a tile (e.g., switching tiles) does not deactivate", () => {
    render(<ProjectsGrid />);
    const grid = screen.getByTestId("projects-grid");

    fireEvent.click(
      screen.getByRole("button", { name: /expand design systems project tile/i }),
    );
    expect(grid).toHaveClass("has-active");

    const ownDesignsTile = screen.getByRole("button", {
      name: /expand own designs project tile/i,
    });
    fireEvent.mouseDown(ownDesignsTile);
    fireEvent.click(ownDesignsTile);

    expect(grid).toHaveClass("has-active");
    const rows = screen.getAllByTestId("projects-row");
    expect(rows[2]).toHaveClass("is-active-row");
    expect(rows[2]).toHaveClass("row-2");
  });

  it("clicking a different tile swaps the active row", () => {
    render(<ProjectsGrid />);

    fireEvent.click(
      screen.getByRole("button", { name: /expand design systems project tile/i }),
    );
    expect(screen.getAllByTestId("projects-row")[0]).toHaveClass(
      "is-active-row",
    );
    expect(screen.getAllByTestId("projects-row")[0]).toHaveClass("row-0");

    fireEvent.click(
      screen.getByRole("button", {
        name: /expand non-technical \(linguistic\) qa project tile/i,
      }),
    );
    expect(screen.getAllByTestId("projects-row")[2]).toHaveClass(
      "is-active-row",
    );
    expect(screen.getAllByTestId("projects-row")[2]).toHaveClass("row-2");
  });
});
