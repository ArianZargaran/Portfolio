import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { MainMenuNavItem } from "./main-menu-nav-item";

interface LinkMockProps extends ComponentProps<"a"> {
  to: string;
  state?: unknown;
}

vi.mock("@remix-run/react", () => ({
  Link: ({ to, state, children, ...rest }: LinkMockProps) => (
    <a href={to} data-state={JSON.stringify(state)} {...rest}>
      {children}
    </a>
  ),
}));

const baseProps = {
  id: "test-id",
  option: "Work",
  caption: "Selected projects",
  href: "/work",
};

describe("MainMenuNavItem", () => {
  it("renders option text in an h2 and caption in an h3", () => {
    render(<MainMenuNavItem {...baseProps} />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Work");
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Selected projects"
    );
  });

  it("renders an anchor whose href matches the href prop", () => {
    render(<MainMenuNavItem {...baseProps} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/work");
  });

  it("passes state={{ isMenuNavigation: true }} to Link via data-state attribute", () => {
    render(<MainMenuNavItem {...baseProps} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "data-state",
      JSON.stringify({ isMenuNavigation: true })
    );
  });

  it("adds is-shown class to hr when isHovered is true", () => {
    render(<MainMenuNavItem {...baseProps} isHovered={true} />);

    // eslint-disable-next-line jest-dom/prefer-to-have-class
    expect(screen.getByTestId("nav-item-hr").className).toMatch(/is-shown/);
  });

  it("does not add is-shown class to hr when isHovered is false", () => {
    render(<MainMenuNavItem {...baseProps} isHovered={false} />);

    expect(
      // eslint-disable-next-line jest-dom/prefer-to-have-class
      screen.getByTestId("nav-item-hr").className,
    ).not.toMatch(/is-shown/);
  });

  it("does not add is-shown class to hr when isHovered is omitted", () => {
    render(<MainMenuNavItem {...baseProps} />);

    expect(
      // eslint-disable-next-line jest-dom/prefer-to-have-class
      screen.getByTestId("nav-item-hr").className,
    ).not.toMatch(/is-shown/);
  });

  it("applies the nav-item_wrapper class to the wrapper anchor", () => {
    render(<MainMenuNavItem {...baseProps} />);

    // eslint-disable-next-line jest-dom/prefer-to-have-class
    expect(screen.getByRole("link").className).toMatch(/nav-item_wrapper/);
  });
});
