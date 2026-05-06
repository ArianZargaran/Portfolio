import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimelineEvent } from "./timeline-event";

const defaultProps = {
  headline: "Senior Engineer",
  description: "Built things at scale.",
  date: "2023 – Present",
};

describe("TimelineEvent", () => {
  it("renders the date, headline, and description exactly as passed", () => {
    render(<TimelineEvent {...defaultProps} />);

    expect(screen.getByText("2023 – Present")).toBeInTheDocument();
    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByText("Built things at scale.")).toBeInTheDocument();
  });

  it("defaults to right orientation when prop is omitted", () => {
    const { container } = render(<TimelineEvent {...defaultProps} />);

    const root = container.firstElementChild as HTMLElement;

    expect(root.className).toContain("right");
    expect(root.className).not.toContain("left");
  });

  it("applies the left class when orientation left is passed", () => {
    const { container } = render(
      <TimelineEvent {...defaultProps} orientation="left" />
    );

    const root = container.firstElementChild as HTMLElement;

    expect(root.className).toContain("left");
  });

  it("renders the bullet element nested inside the line element", () => {
    const { container } = render(<TimelineEvent {...defaultProps} />);

    const line = container.querySelector("[class*='line']") as HTMLElement;
    expect(line).not.toBeNull();

    const bullet = line.querySelector("[class*='bullet']") as HTMLElement;
    expect(bullet).not.toBeNull();
  });

  it("renders headline as h3 and description as a paragraph", () => {
    render(<TimelineEvent {...defaultProps} />);

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Senior Engineer");

    const description = screen.getByText("Built things at scale.");
    expect(description.tagName).toBe("P");
  });
});
