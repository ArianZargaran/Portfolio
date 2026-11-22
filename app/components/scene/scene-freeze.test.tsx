/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   The still <img> and the hero <video>s have no role/text; the freeze
   boundary test has to click them directly. */
import "@testing-library/jest-dom/vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createRoutesStub } from "react-router";

import {
  FREEZE_STORAGE_KEY,
  heroFreeze,
  resetHeroFreezeForTests,
} from "~/scene/hero/freeze";
import { resetHeroGateForTests } from "~/scene/hero/net-gate-store";

import HeroPlayer from "./hero-player";
import { installFakeNet, type FakeNet } from "./hero-player.harness";
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
    // The network gate (M7) passes on a reported 4G connection.
    resetHeroGateForTests();
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { effectiveType: "4g" },
    });
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new Error("no media"));
    HTMLMediaElement.prototype.pause = vi.fn();
  });
  afterEach(() => {
    window.matchMedia = original;
    Reflect.deleteProperty(navigator, "connection");
  });

  it("makes the frame a named, focusable group (not a button) with the hint", async () => {
    mockMatchMedia(LAPTOP);
    await mountHome();
    const group = await screen.findByRole("group", {
      name: /press Enter or Space to pause/i,
    });
    expect(group).toHaveAttribute("tabindex", "0");
    expect(group).toHaveAccessibleDescription(
      /press Esc, or Enter or Space on the scene, to pause/i,
    );
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

  it("change 5: a click or tap anywhere on the scene never pauses (still, frame, video, hotspot)", async () => {
    mockMatchMedia(LAPTOP);
    const { container } = await mountHome();
    const group = await screen.findByRole("group");
    const targets = [
      container.querySelector(".scene-still_img")!,
      group,
      ...container.querySelectorAll(".scene_frame video"),
    ];
    for (const el of targets) {
      fireEvent.pointerDown(el);
      fireEvent.click(el);
      fireEvent.click(el, { detail: 2 });
    }
    expect(heroFreeze().get()).toBe(false);
    expect(group).toHaveAccessibleName(/Press Enter or Space to pause/);
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBeNull();

    fireEvent.click(
      within(group).getAllByRole("link", { name: "About me" })[0],
    );
    expect(heroFreeze().get()).toBe(false);
    expect(await screen.findByText("About page")).toBeInTheDocument();
  });

  it("change 5: a frozen scene stays frozen on click (only the keyboard plays it)", async () => {
    mockMatchMedia(LAPTOP);
    const { container } = await mountHome();
    const group = await screen.findByRole("group");
    fireEvent.keyDown(group, { key: "Enter" });
    expect(heroFreeze().get()).toBe(true);
    fireEvent.click(container.querySelector(".scene-still_img")!);
    expect(heroFreeze().get()).toBe(true);
    fireEvent.keyDown(group, { key: " " });
    expect(heroFreeze().get()).toBe(false);
  });

  it("no visible pause UI or hover hint for pointer users (F4 caption removed)", async () => {
    mockMatchMedia(LAPTOP);
    const { container } = await mountHome();
    const group = await screen.findByRole("group");
    fireEvent.pointerEnter(group);
    expect(container.querySelector(".scene_freeze-hint")).toBeNull();
    expect(screen.queryByText(/click to pause/i)).not.toBeInTheDocument();
    expect(group).not.toHaveAccessibleDescription(/click/i);
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

  it("F1's accessible name stays 'Pause animation' when pressed (review N5)", async () => {
    mockMatchMedia(LAPTOP);
    await mountHome();
    const btn = await screen.findByRole("button", { name: "Pause animation" });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveAccessibleName("Pause animation");
    expect(btn).toHaveTextContent("Pause animation (paused)"); // visual only
  });

  it("puts F1 before the scene group in the tab order (review N6)", async () => {
    mockMatchMedia(LAPTOP);
    await mountHome();
    const btn = await screen.findByRole("button", { name: "Pause animation" });
    const group = screen.getByRole("group");
    expect(group).not.toContainElement(btn);
    expect(
      btn.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("Esc pauses only when the page or the scene has focus (review N7)", async () => {
    mockMatchMedia(LAPTOP);
    await mountHome();
    const group = await screen.findByRole("group");
    const input = document.createElement("input");
    const combo = document.createElement("div");
    combo.setAttribute("role", "combobox");
    combo.tabIndex = 0;
    const popup = document.createElement("div");
    popup.setAttribute("role", "listbox");
    document.body.append(input, combo);
    for (const el of [input, combo]) {
      el.focus();
      fireEvent.keyDown(el, { key: "Escape" });
      expect(heroFreeze().get()).toBe(false);
    }
    document.body.append(popup); // an open popup anywhere
    group.focus();
    fireEvent.keyDown(group, { key: "Escape" });
    expect(heroFreeze().get()).toBe(false);
    popup.remove();
    fireEvent.keyDown(group, { key: "Escape" });
    expect(heroFreeze().get()).toBe(true);
    input.remove();
    combo.remove();
  });

  it("Esc on the page body pauses", async () => {
    mockMatchMedia(LAPTOP);
    await mountHome();
    await screen.findByRole("group");
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(heroFreeze().get()).toBe(true);
  });

  it("F3: a keyboard pause persists across reloads, tagged v2:keyboard", async () => {
    mockMatchMedia(LAPTOP);
    const first = await mountHome();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBe("v2:keyboard");
    first.unmount();
    resetHeroFreezeForTests(); // a reload re-reads storage
    await mountHome();
    expect(
      await screen.findByRole("button", { name: /Pause/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("F3: a stored keyboard freeze is honoured: no player or media", async () => {
    mockMatchMedia(LAPTOP);
    window.localStorage.setItem(FREEZE_STORAGE_KEY, "v2:keyboard");
    const { container } = await mountHome();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 800));
    });
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByRole("button", { name: /Pause/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBe("v2:keyboard");
  });

  it('change 5 migration: a legacy untagged click freeze ("1") is cleared and motion runs', async () => {
    mockMatchMedia(LAPTOP);
    window.localStorage.setItem(FREEZE_STORAGE_KEY, "1");
    await mountHome();
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBeNull();
    expect(heroFreeze().get()).toBe(false);
    expect(
      await screen.findByRole("button", { name: /Pause/ }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("reduced motion: still only, no pause mechanism or group", async () => {
    mockMatchMedia({ ...LAPTOP, "(prefers-reduced-motion: reduce)": true });
    await mountHome();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Pause/ }),
    ).not.toBeInTheDocument();
  });

  it("F5 hook toggles the same shared state (stored v2:control)", () => {
    render(<PauseAnimationsControl />);
    const btn = screen.getByRole("button", { name: "Pause animations" });
    fireEvent.click(btn);
    expect(heroFreeze().get()).toBe(true);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBe("v2:control");
  });
});

/* N2 (Ari, Nov 22 2026, t1035s5644): a click or tap may START a scene the
   network gate left frozen; it never pauses and never overrides a keyboard
   freeze. Reduced motion / Save-Data never load the player: a click does
   nothing there. */
describe("N2: tap to start a gate-frozen scene", () => {
  const original = window.matchMedia;
  let net: FakeNet;
  beforeEach(() => {
    window.localStorage.clear();
    resetHeroFreezeForTests();
    resetHeroGateForTests();
    delete document.documentElement.dataset.heroGate;
    // No connection API and no measurable timing -> the gate says "frozen".
    Reflect.deleteProperty(navigator, "connection");
    net = installFakeNet();
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = vi.fn();
  });
  afterEach(() => {
    window.matchMedia = original;
    Reflect.deleteProperty(navigator, "connection");
  });
  const wait = (ms: number) =>
    act(async () => {
      await new Promise((r) => setTimeout(r, ms));
    });
  const gateFrozen = async () => {
    mockMatchMedia(LAPTOP);
    const view = await mountHome();
    const group = await screen.findByRole("group");
    await waitFor(() =>
      expect(document.documentElement.dataset.heroGate).toBe(
        "frozen:inconclusive",
      ),
    );
    await waitFor(() => expect(heroFreeze().get()).toBe(true));
    await wait(400);
    expect(view.container.querySelector(".hero")).toBeNull(); // still only
    expect(net.fetched()).toEqual([]);
    return { ...view, group };
  };

  it("a click on the scene starts a gate-frozen scene; the loop is charged per clip as before", async () => {
    const { container, group } = await gateFrozen();
    fireEvent.click(container.querySelector(".scene-still_img")!);
    expect(heroFreeze().get()).toBe(false);
    expect(group).toHaveAccessibleName(/Press Enter or Space to pause/);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Scene animation playing",
    );
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBeNull();
    await waitFor(() =>
      expect(container.querySelector(".hero")?.getAttribute("data-bytes")).toBe(
        String(net.sent()),
      ),
    );
    // Only the typing loop, fetched once and charged its full size.
    expect(net.fetched()).toEqual(["typing"]);
    expect(net.sent()).toBeGreaterThan(0);
  });

  it("a second click on the now-moving scene does not pause it", async () => {
    const { container, group } = await gateFrozen();
    fireEvent.click(group);
    expect(heroFreeze().get()).toBe(false);
    await waitFor(() =>
      expect(container.querySelector(".hero")).not.toBeNull(),
    );
    const targets = [
      group,
      container.querySelector(".scene-still_img")!,
      ...container.querySelectorAll(".scene_frame video"),
    ];
    for (const el of targets) {
      fireEvent.pointerDown(el);
      fireEvent.click(el);
      expect(heroFreeze().get()).toBe(false); // after EVERY click
      fireEvent.click(el, { detail: 2 });
      expect(heroFreeze().get()).toBe(false);
    }
    expect(container.querySelector(".hero")).not.toHaveAttribute("data-frozen");
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBeNull();
  });

  it("a click on a hotspot link navigates and does not start the scene", async () => {
    const { group } = await gateFrozen();
    fireEvent.click(
      within(group).getAllByRole("link", { name: "About me" })[0],
    );
    expect(await screen.findByText("About page")).toBeInTheDocument();
    expect(heroFreeze().get()).toBe(true);
  });

  it("the F1 button keeps its own click (toggles once, no double toggle)", async () => {
    await gateFrozen();
    const btn = screen.getByRole("button", { name: "Pause animation" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(btn);
    expect(heroFreeze().get()).toBe(false);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("a stored keyboard freeze (v2:keyboard) stays frozen on click; only the keyboard plays it", async () => {
    mockMatchMedia(LAPTOP);
    window.localStorage.setItem(FREEZE_STORAGE_KEY, "v2:keyboard");
    const { container } = await mountHome();
    const group = await screen.findByRole("group");
    await waitFor(() =>
      expect(document.documentElement.dataset.heroGate).toBe(
        "frozen:inconclusive",
      ),
    );
    fireEvent.click(container.querySelector(".scene-still_img")!);
    expect(heroFreeze().get()).toBe(true);
    fireEvent.click(group);
    expect(heroFreeze().get()).toBe(true);
    await wait(400);
    expect(container.querySelector(".hero")).toBeNull();
    expect(net.fetched()).toEqual([]);
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBe("v2:keyboard");
    fireEvent.keyDown(group, { key: "Enter" });
    expect(heroFreeze().get()).toBe(false);
  });

  it("Esc on a gate-frozen scene makes it a keyboard freeze: a click then does nothing", async () => {
    const { group } = await gateFrozen();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBe("v2:keyboard");
    fireEvent.click(group);
    expect(heroFreeze().get()).toBe(true);
  });

  it("Esc on a gate-frozen scene is announced in the polite status (screen-reader confirmation)", async () => {
    const { group } = await gateFrozen();
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("");
    expect(group).toHaveAccessibleName(/paused/i);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(status).toHaveTextContent("Scene animation paused");
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBe("v2:keyboard");
    // Still only the keyboard plays it (WCAG 2.2.2), and that is announced.
    fireEvent.click(group);
    expect(heroFreeze().get()).toBe(true);
    fireEvent.keyDown(group, { key: "Enter" });
    expect(heroFreeze().get()).toBe(false);
    expect(status).toHaveTextContent("Scene animation playing");
  });

  it("Esc on an already keyboard-paused scene changes nothing and announces nothing new", async () => {
    const { group } = await gateFrozen();
    fireEvent.keyDown(group, { key: "Enter" }); // play
    fireEvent.keyDown(group, { key: " " }); // pause: "paused" announced
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Scene animation paused");
    fireEvent.keyDown(group, { key: "Enter" }); // play
    expect(status).toHaveTextContent("Scene animation playing");
    fireEvent.keyDown(document.body, { key: "Escape" }); // pause
    expect(status).toHaveTextContent("Scene animation paused");
    fireEvent.keyDown(document.body, { key: "Escape" }); // no-op
    expect(heroFreeze().get()).toBe(true);
    expect(status).toHaveTextContent("Scene animation paused");
  });

  it("after unmount the scene's click and key listeners are gone (REVIEW-4 N4)", async () => {
    const view = await gateFrozen();
    const frame = view.container.querySelector<HTMLElement>(".scene_frame")!;
    const tap = vi.spyOn(heroFreeze(), "startFromTap");
    const set = vi.spyOn(heroFreeze(), "set");
    const toggle = vi.spyOn(heroFreeze(), "toggle");
    view.unmount();
    expect(frame.isConnected).toBe(false);
    fireEvent.click(frame);
    fireEvent.keyDown(frame, { key: "Enter" });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(tap).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(toggle).not.toHaveBeenCalled();
    expect(heroFreeze().get()).toBe(true);
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBeNull();
  });

  it("keyboard play then pause on a gate-frozen scene: a click does nothing", async () => {
    const { group } = await gateFrozen();
    fireEvent.keyDown(group, { key: "Enter" }); // play
    fireEvent.keyDown(group, { key: " " }); // pause (keyboard)
    expect(heroFreeze().get()).toBe(true);
    fireEvent.click(group);
    expect(heroFreeze().get()).toBe(true);
  });

  it.each([
    ["reduced motion", { "(prefers-reduced-motion: reduce)": true }, {}],
    ["Save-Data", {}, { effectiveType: "4g", saveData: true }],
  ] as const)(
    "%s: a click does nothing (no group, no player, no media)",
    async (_, mq, conn) => {
      if ("saveData" in conn)
        Object.defineProperty(navigator, "connection", {
          configurable: true,
          value: conn,
        });
      mockMatchMedia({ ...LAPTOP, ...mq });
      const { container } = await mountHome();
      await wait(800);
      expect(screen.queryByRole("group")).not.toBeInTheDocument();
      fireEvent.click(container.querySelector(".scene-still_img")!);
      fireEvent.click(container.querySelector(".scene_frame")!);
      await wait(800);
      expect(heroFreeze().get()).toBe(false);
      expect(container.querySelector(".hero")).toBeNull();
      expect(net.fetched()).toEqual([]);
      expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBeNull();
    },
  );
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
