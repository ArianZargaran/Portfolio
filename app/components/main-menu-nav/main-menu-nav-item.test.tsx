import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MainMenuNavItem } from "./main-menu-nav-item";

vi.mock("@remix-run/react", () => ({
  Link: ({ to, state, children, ...rest }: any) => (
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
    const { getByRole } = render(<MainMenuNavItem {...baseProps} />);

    expect(getByRole("heading", { level: 2 })).toHaveTextContent("Work");
    expect(getByRole("heading", { level: 3 })).toHaveTextContent(
      "Selected projects"
    );
  });

  it("renders an anchor whose href matches the href prop", () => {
    const { getByRole } = render(<MainMenuNavItem {...baseProps} />);

    expect(getByRole("link")).toHaveAttribute("href", "/work");
  });

  it("passes state={{ isMenuNavigation: true }} to Link via data-state attribute", () => {
    const { getByRole } = render(<MainMenuNavItem {...baseProps} />);

    const anchor = getByRole("link");
    const state = JSON.parse(anchor.getAttribute("data-state") ?? "{}");
    expect(state).toEqual({ isMenuNavigation: true });
  });

  it("adds is-shown class to hr when isHovered is true", () => {
    const { container } = render(
      <MainMenuNavItem {...baseProps} isHovered={true} />
    );

    const hr = container.querySelector("hr");
    expect(hr).not.toBeNull();
    expect(hr!.className).toContain("is-shown");
  });

  it("does not add is-shown class to hr when isHovered is false", () => {
    const { container } = render(
      <MainMenuNavItem {...baseProps} isHovered={false} />
    );

    const hr = container.querySelector("hr");
    expect(hr).not.toBeNull();
    expect(hr!.className).not.toContain("is-shown");
  });

  it("does not add is-shown class to hr when isHovered is omitted", () => {
    const { container } = render(<MainMenuNavItem {...baseProps} />);

    const hr = container.querySelector("hr");
    expect(hr).not.toBeNull();
    expect(hr!.className).not.toContain("is-shown");
  });

  it("applies the nav-item_wrapper class to the wrapper anchor", () => {
    const { getByRole } = render(<MainMenuNavItem {...baseProps} />);

    const anchor = getByRole("link");
    expect(anchor.className).toContain("nav-item_wrapper");
  });
});
