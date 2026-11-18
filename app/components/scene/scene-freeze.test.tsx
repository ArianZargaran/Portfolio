/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   The still <img> and the hero <video>s have no role/text; the freeze
   boundary test has to click them directly. */
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";

import {
  FREEZE_STORAGE_KEY,
  heroFreeze,
  resetHeroFreezeForTests,
} from "~/scene/hero/freeze";

import HeroPlayer from "./hero-player";
import { PauseAnimationsControl } from "./scene-freeze";
import { SceneShell } from "./scene-shell";

function mockMatchMedia(matches: Record<string, boolean>) {
  window.matchMedia = ((q: string) => ({
    matches: matches[q] ?? false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const LAPTOP = { "(min-width: 1025px)": true };

const mountHome = async () => {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <SceneShell motion /> },
    { path: "/about", Component: () => <p>About page</p> },
  ]);
  const view = render(<Stub initialEntries={["/"]} />);
  await screen.findAllByRole("navigation", { name: "Scene" });
  return view;
};

describe("scene freeze (WCAG 2.2.2, F1-F3)", () => {
  const original = window.matchMedia;
  beforeEach(() => {
    window.localStorage.clear();
    resetHeroFreezeForTests();
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new Error("no media"));
    HTMLMediaElement.prototype.pause = vi.fn();
  });
  afterEach(() => {
    window.matchMedia = original;
  });

  it("makes the frame a named, focusable group (not a button) with the hint", async () => {
    mockMatchMedia(LAPTOP);
    await mountHome();
    const group = await screen.findByRole("group", {
      name: /press Enter or Space to pause/i,
    });
    expect(group).toHaveAttribute("tabindex", "0");
    expect(group).toHaveAccessibleDescription(/press Esc to pause/i);
    expect(
      screen.queryByRole("button", { name: /scene/i }),
    ).not.toBeInTheDocument();
    // Hotspot links stay links, reachable inside the group.
    expect(within(group).getAllByRole("link", { name: "Work" })).toHaveLength(
      3,
    );
  });

  it("F1: a native pause toggle with an accurate aria-pressed", async () => {
    mockMatchMedia(LAPTOP);
    await mountHome();
    const btn = await screen.findByRole("button", { name: "Pause animation" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(heroFreeze().get()).toBe(true); // toggled once, not twice
    expect(screen.getByRole("status")).toHaveTextContent(
      "Scene animation paused",
    );
  });

  it("toggles on a background click, never on a hotspot click", async () => {
    mockMatchMedia(LAPTOP);
    const { container } = await mountHome();
    const group = await screen.findByRole("group");
    fireEvent.click(container.querySelector(".scene-still_img")!);
    expect(heroFreeze().get()).toBe(true);
    expect(group).toHaveAccessibleName(/paused\. Press Enter or Space to play/);
    fireEvent.click(container.querySelector(".scene-still_img")!);
    expect(heroFreeze().get()).toBe(false);

    fireEvent.click(
      within(group).getAllByRole("link", { name: "About me" })[0],
    );
    expect(heroFreeze().get()).toBe(false);
    expect(await screen.findByText("About page")).toBeInTheDocument();
  });

  it("Enter/Space on the focused frame toggle; Enter on a link does not", async () => {
    mockMatchMedia(LAPTOP);
    await mountHome();
    const group = await screen.findByRole("group");
    fireEvent.keyDown(group, { key: "Enter" });
    expect(heroFreeze().get()).toBe(true);
    fireEvent.keyDown(group, { key: " " });
    expect(heroFreeze().get()).toBe(false);
    fireEvent.keyDown(within(group).getAllByRole("link")[0], { key: "Enter" });
    expect(heroFreeze().get()).toBe(false);
  });

  it("Esc pauses (and never resumes), unless a modal is open", async () => {
    mockMatchMedia(LAPTOP);
    await mountHome();
    await screen.findByRole("group");
    const modal = document.createElement("div");
    modal.setAttribute("aria-modal", "true");
    document.body.append(modal);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(heroFreeze().get()).toBe(false);
    modal.remove();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(heroFreeze().get()).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(heroFreeze().get()).toBe(true);
  });

  it("F3: persists across reloads", async () => {
    mockMatchMedia(LAPTOP);
    const first = await mountHome();
    fireEvent.click(await screen.findByRole("button", { name: /Pause/ }));
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBe("1");
    first.unmount();
    resetHeroFreezeForTests(); // a reload re-reads storage
    await mountHome();
    expect(
      await screen.findByRole("button", { name: /Pause/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("F3: a stored freeze loads no player or media", async () => {
    mockMatchMedia(LAPTOP);
    window.localStorage.setItem(FREEZE_STORAGE_KEY, "1");
    const { container } = await mountHome();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 800));
    });
    expect(container.querySelector("video")).toBeNull();
  });

  it("reduced motion: still only, no pause mechanism or group", async () => {
    mockMatchMedia({ ...LAPTOP, "(prefers-reduced-motion: reduce)": true });
    await mountHome();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Pause/ }),
    ).not.toBeInTheDocument();
  });

  it("F5 hook toggles the same shared state", () => {
    render(<PauseAnimationsControl />);
    const btn = screen.getByRole("button", { name: "Pause animations" });
    fireEvent.click(btn);
    expect(heroFreeze().get()).toBe(true);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });
});

describe("HeroPlayer freeze (instant stop)", () => {
  it("pauses every clip when frozen and marks the root", () => {
    HTMLMediaElement.prototype.play = () => new Promise<void>(() => undefined); // never settles
    const pause = vi.fn();
    HTMLMediaElement.prototype.pause = pause;
    const { container, rerender } = render(<HeroPlayer />);
    pause.mockClear();
    rerender(<HeroPlayer frozen />);
    expect(pause).toHaveBeenCalled();
    expect(container.querySelector(".hero")).toHaveAttribute("data-frozen");
  });
});
