import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MainMenuNav from "./main-menu-nav";

const { useLocationMock } = vi.hoisted(() => ({
  useLocationMock: vi.fn(() => ({
    pathname: "/",
    state: null as null | { isMenuNavigation?: boolean },
  })),
}));

interface LinkMockProps extends ComponentProps<"a"> {
  to: string;
}

interface HamburgerIconMockProps {
  isOpen: boolean;
  onClick?: () => void;
  className?: string;
}

vi.mock("@remix-run/react", () => ({
  useLocation: useLocationMock,
  Link: ({ to, children, ...rest }: LinkMockProps) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("animatea", () => ({
  HamburgerIcon: ({ isOpen, onClick, className }: HamburgerIconMockProps) => (
    <button
      type="button"
      data-testid="menu-toggle"
      data-open={isOpen}
      onClick={onClick}
      className={className}
    >
      menu
    </button>
  ),
}));

const matchMediaStub = (matches: boolean) =>
  vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

beforeEach(() => {
  useLocationMock.mockReturnValue({ pathname: "/", state: null });
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: matchMediaStub(false),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const fakeOptions = [
  { id: "1", option: "Home", caption: "Start here", href: "/" },
  { id: "2", option: "About", caption: "Who I am", href: "/about-me" },
  { id: "3", option: "Projects", caption: "What I built", href: "/projects" },
];

describe("MainMenuNav", () => {
  it("renders the toggle button with data-open false when menu is initially closed", () => {
    render(<MainMenuNav options={fakeOptions} />);

    const toggle = screen.getByTestId("menu-toggle");
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("data-open", "false");
  });

  it("does not render the nav list when menu is initially closed", () => {
    render(<MainMenuNav options={fakeOptions} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows the nav list and sets data-open to true after clicking the toggle", () => {
    render(<MainMenuNav options={fakeOptions} />);

    fireEvent.click(screen.getByTestId("menu-toggle"));

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByTestId("menu-toggle")).toHaveAttribute(
      "data-open", "true"
    );
  });

  it("renders one list item per option entry when the menu is open", () => {
    render(<MainMenuNav options={fakeOptions} />);

    fireEvent.click(screen.getByTestId("menu-toggle"));

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(fakeOptions.length);
  });

  it("removes the nav list from the DOM when the toggle is clicked a second time", async () => {
    render(<MainMenuNav options={fakeOptions} />);

    fireEvent.click(screen.getByTestId("menu-toggle"));
    expect(screen.getByRole("list")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("menu-toggle"));

    // AnimatePresence mode="wait" keeps the exiting element mounted until its
    // exit animation settles — wait for the DOM to clear asynchronously.
    await waitFor(() => {
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  it("auto-closes the menu when navigation carries isMenuNavigation state", async () => {
    const { rerender } = render(<MainMenuNav options={fakeOptions} />);

    fireEvent.click(screen.getByTestId("menu-toggle"));
    expect(screen.getByRole("list")).toBeInTheDocument();

    useLocationMock.mockReturnValue({
      pathname: "/about-me",
      state: { isMenuNavigation: true },
    });
    rerender(<MainMenuNav options={fakeOptions} />);

    await waitFor(() => {
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });
});
