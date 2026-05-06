import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Button from "./button";

describe("Button", () => {
  it("renders a button element by default when no href is provided", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toBeDefined();
  });

  it("renders an anchor element with the correct href when href is provided", () => {
    render(<Button href="https://example.com">Link</Button>);
    const link = screen.getByRole("link");
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("https://example.com");
  });

  it("forwards target, rel, and download attributes onto the anchor element", () => {
    render(
      <Button
        href="https://example.com/file.pdf"
        target="_blank"
        rel="noopener noreferrer"
        download="file.pdf"
      >
        Download
      </Button>
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("download")).toBe("file.pdf");
  });

  it("renders children content inside the element", () => {
    render(<Button>My Label</Button>);
    expect(screen.getByRole("button").textContent).toBe("My Label");
  });

  it("forwards onClick to the button element and calls the handler on click", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("forwards aria-label via rest props to the button element", () => {
    render(<Button aria-label="close dialog">X</Button>);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe(
      "close dialog"
    );
  });

  it("composes custom className with the base button and primary variant classes", () => {
    render(<Button className="my-custom-class">Styled</Button>);
    const el = screen.getByRole("button");
    expect(el.className).toContain("button");
    expect(el.className).toContain("primary");
    expect(el.className).toContain("my-custom-class");
  });
});
