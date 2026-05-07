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

  it("each tile has a unique expand aria-label for AIRTABLE, CABIFY, and ANIMATEA", () => {
    render(<ProjectsGrid />);
    expect(
      screen.getByRole("button", { name: /expand airtable project tile/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand cabify project tile/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /expand animatea project tile/i }),
    ).toBeInTheDocument();
  });

  it("clicking a tile marks it active and adds has-active to grid + is-active-row to its row", () => {
    render(<ProjectsGrid />);
    const grid = screen.getByTestId("projects-grid");

    expect(grid).not.toHaveClass("has-active");

    fireEvent.click(
      screen.getByRole("button", { name: /expand airtable project tile/i }),
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
      screen.getByRole("button", { name: /expand cabify project tile/i }),
    );
    expect(grid).toHaveClass("has-active");

    fireEvent.click(
      screen.getByRole("button", { name: /cabify project tile, expanded/i }),
    );
    expect(grid).toHaveClass("has-active");
  });

  it("mousedown outside any tile deactivates the active tile", () => {
    render(<ProjectsGrid />);
    const grid = screen.getByTestId("projects-grid");

    fireEvent.click(
      screen.getByRole("button", { name: /expand cabify project tile/i }),
    );
    expect(grid).toHaveClass("has-active");

    fireEvent.mouseDown(document.body);
    expect(grid).not.toHaveClass("has-active");
  });

  it("mousedown inside a tile (e.g., switching tiles) does not deactivate", () => {
    render(<ProjectsGrid />);
    const grid = screen.getByTestId("projects-grid");

    fireEvent.click(
      screen.getByRole("button", { name: /expand airtable project tile/i }),
    );
    expect(grid).toHaveClass("has-active");

    const appleTile = screen.getByRole("button", {
      name: /expand apple project tile/i,
    });
    fireEvent.mouseDown(appleTile);
    fireEvent.click(appleTile);

    expect(grid).toHaveClass("has-active");
    const rows = screen.getAllByTestId("projects-row");
    expect(rows[1]).toHaveClass("is-active-row");
    expect(rows[1]).toHaveClass("row-1");
  });

  it("clicking a different tile swaps the active row", () => {
    render(<ProjectsGrid />);

    fireEvent.click(
      screen.getByRole("button", { name: /expand airtable project tile/i }),
    );
    expect(screen.getAllByTestId("projects-row")[0]).toHaveClass(
      "is-active-row",
    );
    expect(screen.getAllByTestId("projects-row")[0]).toHaveClass("row-0");

    fireEvent.click(
      screen.getByRole("button", { name: /expand apple project tile/i }),
    );
    expect(screen.getAllByTestId("projects-row")[1]).toHaveClass(
      "is-active-row",
    );
    expect(screen.getAllByTestId("projects-row")[1]).toHaveClass("row-1");
  });
});
