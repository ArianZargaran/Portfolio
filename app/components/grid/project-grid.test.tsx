import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./projects-modal", () => ({
  ProjectsModal: ({
    selectedProject,
    onClose,
  }: {
    selectedProject?: string;
    onClose?: () => void;
  }) =>
    selectedProject ? (
      <div data-testid="modal-stub" data-selected={selectedProject}>
        <button type="button" onClick={onClose}>
          close-stub
        </button>
      </div>
    ) : null,
}));

import { ProjectsGrid } from "./project-grid";

describe("ProjectsGrid", () => {
  it("renders 7 project tiles", () => {
    render(<ProjectsGrid />);
    const tiles = screen.getAllByRole("button", { name: /project details/i });
    expect(tiles).toHaveLength(7);
  });

  it("renders 3 rows as ul elements with a class containing 'row'", () => {
    const { container } = render(<ProjectsGrid />);
    const rows = Array.from(container.querySelectorAll("ul")).filter((el) =>
      el.className.includes("row"),
    );
    expect(rows).toHaveLength(3);
  });

  it("each tile has a unique aria-label for AIRTABLE, CABIFY, and ANIMATEA", () => {
    render(<ProjectsGrid />);
    expect(
      screen.getByRole("button", { name: /open airtable project details/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open cabify project details/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open animatea project details/i }),
    ).toBeInTheDocument();
  });

  it("clicking an AIRTABLE tile opens the modal stub with data-selected='airtable'", () => {
    render(<ProjectsGrid />);

    expect(screen.queryByTestId("modal-stub")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /open airtable project details/i }),
    );

    const modal = screen.getByTestId("modal-stub");
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute("data-selected", "airtable");
  });

  it("clicking the modal close button removes the modal stub from the DOM", () => {
    render(<ProjectsGrid />);

    fireEvent.click(
      screen.getByRole("button", { name: /open cabify project details/i }),
    );
    expect(screen.getByTestId("modal-stub")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close-stub/i }));
    expect(screen.queryByTestId("modal-stub")).not.toBeInTheDocument();
  });
});
