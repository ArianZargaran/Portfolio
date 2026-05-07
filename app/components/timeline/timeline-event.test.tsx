import { render, screen, within } from "@testing-library/react";
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
    render(<TimelineEvent {...defaultProps} />);

    const root = screen.getByTestId("timeline-event");
    // eslint-disable-next-line jest-dom/prefer-to-have-class
    expect(root.className).toMatch(/right/);
    // eslint-disable-next-line jest-dom/prefer-to-have-class
    expect(root.className).not.toMatch(/left/);
  });

  it("applies the left class when orientation left is passed", () => {
    render(<TimelineEvent {...defaultProps} orientation="left" />);

    // eslint-disable-next-line jest-dom/prefer-to-have-class
    expect(screen.getByTestId("timeline-event").className).toMatch(/left/);
  });

  it("renders the bullet element nested inside the line element", () => {
    render(<TimelineEvent {...defaultProps} />);

    const line = screen.getByTestId("timeline-line");
    expect(line).toBeInTheDocument();
    expect(within(line).getByTestId("timeline-bullet")).toBeInTheDocument();
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
