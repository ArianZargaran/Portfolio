import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Noise } from "./noise";

describe("Noise", () => {
  it("renders an aria-hidden div", () => {
    render(<Noise data-testid="noise" />);
    expect(screen.getByTestId("noise")).toHaveAttribute("aria-hidden", "true");
  });

  it("merges a custom className with the styles.noise class", () => {
    render(<Noise data-testid="noise" className="my-extra" />);
    const el = screen.getByTestId("noise");
    expect(el).toHaveClass("my-extra");
    // eslint-disable-next-line jest-dom/prefer-to-have-class
    expect(el.className).toMatch(/noise/);
  });

  it("forwards arbitrary HTML attributes via rest props", () => {
    render(<Noise data-testid="noise" id="background-noise" />);
    expect(screen.getByTestId("noise")).toHaveAttribute(
      "id",
      "background-noise",
    );
  });

  it("does not crash when className is omitted", () => {
    const { container } = render(<Noise />);
    expect(container).not.toBeEmptyDOMElement();
  });
});
