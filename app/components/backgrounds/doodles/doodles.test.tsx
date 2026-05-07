import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Doodles } from "./doodles";

describe("Doodles", () => {
  it("renders an aria-hidden div", () => {
    render(<Doodles data-testid="doodles" />);
    expect(screen.getByTestId("doodles")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("merges a custom className with the styles.svg class", () => {
    render(<Doodles data-testid="doodles" className="my-extra" />);
    const el = screen.getByTestId("doodles");
    expect(el).toHaveClass("my-extra");
    // eslint-disable-next-line jest-dom/prefer-to-have-class
    expect(el.className).toMatch(/svg/);
  });

  it("forwards arbitrary HTML attributes via rest props", () => {
    render(<Doodles data-testid="doodles" id="background-doodles" />);
    expect(screen.getByTestId("doodles")).toHaveAttribute(
      "id",
      "background-doodles",
    );
  });

  it("does not crash when className is omitted", () => {
    const { container } = render(<Doodles />);
    expect(container).not.toBeEmptyDOMElement();
  });
});
