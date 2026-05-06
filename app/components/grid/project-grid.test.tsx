import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { ProjectsGrid } from "./project-grid";

describe("ProjectsGrid", () => {
  it("renders 7 project tiles", () => {
    render(<ProjectsGrid />);
    const tiles = screen.getAllByRole("button", { name: /project tile/i });
    expect(tiles).toHaveLength(7);
  });

  it("renders 3 rows as ul elements with a class containing 'row'", () => {
    const { container } = render(<ProjectsGrid />);
    const rows = Array.from(container.querySelectorAll("ul")).filter((el) =>
      el.className.includes("row"),
    );
    expect(rows).toHaveLength(3);
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
    const { container } = render(<ProjectsGrid />);
    const grid = container.querySelector(".grid")!;

    expect(grid.className.includes("has-active")).toBe(false);

    fireEvent.click(
      screen.getByRole("button", { name: /expand airtable project tile/i }),
    );

    expect(grid.className.includes("has-active")).toBe(true);
    const activeRow = container.querySelector(".row.is-active-row");
    expect(activeRow).not.toBeNull();
    expect(activeRow!.className.includes("row-0")).toBe(true);
  });

  it("clicking the active tile again keeps it active", () => {
    const { container } = render(<ProjectsGrid />);

    fireEvent.click(
      screen.getByRole("button", { name: /expand cabify project tile/i }),
    );
    expect(container.querySelector(".grid")!.className).toContain("has-active");

    fireEvent.click(
      screen.getByRole("button", { name: /cabify project tile, expanded/i }),
    );
    expect(container.querySelector(".grid")!.className).toContain("has-active");
  });

  it("mousedown outside any tile deactivates the active tile", () => {
    const { container } = render(<ProjectsGrid />);

    fireEvent.click(
      screen.getByRole("button", { name: /expand cabify project tile/i }),
    );
    expect(container.querySelector(".grid")!.className).toContain("has-active");

    fireEvent.mouseDown(document.body);
    expect(container.querySelector(".grid")!.className).not.toContain(
      "has-active",
    );
  });

  it("mousedown inside a tile (e.g., switching tiles) does not deactivate", () => {
    const { container } = render(<ProjectsGrid />);

    fireEvent.click(
      screen.getByRole("button", { name: /expand airtable project tile/i }),
    );
    expect(container.querySelector(".grid")!.className).toContain("has-active");

    const appleTile = screen.getByRole("button", {
      name: /expand apple project tile/i,
    });
    fireEvent.mouseDown(appleTile);
    fireEvent.click(appleTile);

    expect(container.querySelector(".grid")!.className).toContain("has-active");
    expect(
      container.querySelector(".row.is-active-row")!.className.includes(
        "row-1",
      ),
    ).toBe(true);
  });

  it("clicking a different tile swaps the active row", () => {
    const { container } = render(<ProjectsGrid />);

    fireEvent.click(
      screen.getByRole("button", { name: /expand airtable project tile/i }),
    );
    expect(
      container.querySelector(".row.is-active-row")!.className.includes(
        "row-0",
      ),
    ).toBe(true);

    fireEvent.click(
      screen.getByRole("button", { name: /expand apple project tile/i }),
    );
    expect(
      container.querySelector(".row.is-active-row")!.className.includes(
        "row-1",
      ),
    ).toBe(true);
  });
});
