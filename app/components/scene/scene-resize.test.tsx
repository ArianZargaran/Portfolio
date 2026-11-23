/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   The hero player root and still have no role/text. */
/**
 * Resize refreeze fix (Ari t1038s5660; review of f3b0398, Note 2). Once the
 * visitor has started a gate-frozen scene (tap, or Enter/Space), the scene
 * must not come back frozen, re-download the loop or reset `data-bytes`
 * when motion comes back in the same page load: the window narrowing below
 * 1025 px and widening again, or a hotspot page and back. A keyboard or
 * control freeze (stored or later) still wins; reduced motion and Save-Data
 * still stop everything; a new visit still gate-freezes.
 */
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRoutesStub, Link } from "react-router";

import {
  FREEZE_STORAGE_KEY,
  heroFreeze,
  resetHeroFreezeForTests,
} from "~/scene/hero/freeze";
import { resetHeroGateForTests } from "~/scene/hero/net-gate-store";
import { resetHeroVisitForTests } from "~/scene/hero/visit-media";

import { installFakeNet, type FakeNet } from "./hero-player.harness";
import { SceneShell } from "./scene-shell";

const LAPTOP = "(min-width: 1025px)";
const REDUCE = "(prefers-reduced-motion: reduce)";
const TYPING_H264 = 442_525; // happy-dom can't play AV1 -> H.264

type Listener = () => void;
let mq: Record<string, boolean>;
let mqListeners: Record<string, Set<Listener>>;
const originalMatchMedia = window.matchMedia;
function mockMatchMedia() {
  window.matchMedia = ((q: string) => ({
    get matches() {
      return mq[q] ?? false;
    },
    media: q,
    addEventListener: (_: string, l: Listener) =>
      (mqListeners[q] ??= new Set()).add(l),
    removeEventListener: (_: string, l: Listener) => mqListeners[q]?.delete(l),
  })) as unknown as typeof window.matchMedia;
}
const setMq = async (q: string, v: boolean) => {
  act(() => {
    mq[q] = v;
    mqListeners[q]?.forEach((l) => l());
  });
  await wait(400);
};
const wait = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });

let net: FakeNet;
beforeEach(() => {
  window.localStorage.clear();
  resetHeroFreezeForTests();
  resetHeroGateForTests();
  resetHeroVisitForTests();
  delete document.documentElement.dataset.heroGate;
  // No connection API and no measurable timing -> the gate says "frozen".
  Reflect.deleteProperty(navigator, "connection");
  net = installFakeNet();
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.canPlayType = () => "";
  mq = { [LAPTOP]: true };
  mqListeners = {};
  mockMatchMedia();
});
afterEach(() => {
  window.matchMedia = originalMatchMedia;
  Reflect.deleteProperty(navigator, "connection");
});

const mountHome = async () => {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <SceneShell motion /> },
    {
      path: "/about",
      Component: () => (
        <>
          <p>About page</p>
          <Link to="/">Back home</Link>
        </>
      ),
    },
  ]);
  const view = render(<Stub initialEntries={["/"]} />);
  await screen.findAllByRole("navigation", { name: "Scene" });
  return view;
};
const hero = (c: HTMLElement) => c.querySelector<HTMLElement>(".hero");
const gateFrozen = async () => {
  const view = await mountHome();
  const group = await screen.findByRole("group");
  await wait(400);
  expect(document.documentElement.dataset.heroGate).toBe("frozen:inconclusive");
  expect(heroFreeze().get()).toBe(true);
  expect(hero(view.container)).toBeNull();
  expect(net.fetched()).toEqual([]);
  return { ...view, group };
};
/** Gate-frozen, then started by a tap; the loop is fetched once and charged. */
const tapStarted = async () => {
  const v = await gateFrozen();
  fireEvent.click(v.container.querySelector(".scene-still_img")!);
  await wait(400);
  expect(heroFreeze().get()).toBe(false);
  expect(hero(v.container)).not.toBeNull();
  expect(net.fetched()).toEqual(["typing"]);
  expect(hero(v.container)!.dataset.bytes).toBe(String(TYPING_H264));
  return v;
};
/** Below 1025 px (no player) and back. */
const narrowAndBack = async (c: HTMLElement) => {
  await setMq(LAPTOP, false);
  expect(hero(c)).toBeNull();
  expect(screen.queryByRole("group")).not.toBeInTheDocument();
  await setMq(LAPTOP, true);
};
const expectPlayingNoRefetch = (c: HTMLElement) => {
  expect(heroFreeze().get()).toBe(false);
  expect(screen.getByRole("group")).toHaveAccessibleName(
    /Press Enter or Space to pause/,
  );
  expect(hero(c)).not.toBeNull();
  expect(hero(c)).not.toHaveAttribute("data-frozen");
  expect(net.fetched()).toEqual(["typing"]); // the visit's blob is re-used
  expect(hero(c)!.dataset.bytes).toBe(String(TYPING_H264)); // not reset, not doubled
  expect(net.sent()).toBe(TYPING_H264);
  expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBeNull();
};

describe("resize refreeze fix: a started scene stays started this visit", () => {
  it("tap-start, then below 1025 px and back (twice): not frozen, loop not fetched again, bytes stable", async () => {
    const { container } = await tapStarted();
    await narrowAndBack(container);
    expectPlayingNoRefetch(container);
    await narrowAndBack(container);
    expectPlayingNoRefetch(container);
    expect(net.fetched()).toEqual(["typing"]);
  });

  it("Enter/Space play counts as a start too", async () => {
    const { container, group } = await gateFrozen();
    fireEvent.keyDown(group, { key: "Enter" });
    await wait(400);
    expect(net.fetched()).toEqual(["typing"]);
    await narrowAndBack(container);
    expectPlayingNoRefetch(container);
  });

  it("tap-start, a hotspot page, then back home: not frozen, loop not fetched again", async () => {
    const { container, group } = await tapStarted();
    fireEvent.click(
      Array.from(group.querySelectorAll("a")).find(
        (a) => a.textContent === "About me",
      )!,
    );
    expect(await screen.findByText("About page")).toBeInTheDocument();
    expect(hero(container)).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Back home" }));
    await screen.findAllByRole("navigation", { name: "Scene" });
    await wait(400);
    expectPlayingNoRefetch(container);
  });

  it("a keyboard pause after the start still wins across the resize (stored, no tap override)", async () => {
    const { container } = await tapStarted();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(heroFreeze().get()).toBe(true);
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBe("v2:keyboard");
    await narrowAndBack(container);
    expect(heroFreeze().get()).toBe(true);
    fireEvent.click(container.querySelector(".scene-still_img")!);
    expect(heroFreeze().get()).toBe(true);
    expect(net.fetched()).toEqual(["typing"]);
    // Only the keyboard plays it; still no second loop download.
    fireEvent.keyDown(screen.getByRole("group"), { key: "Enter" });
    await wait(400);
    expectPlayingNoRefetch(container);
  });

  it.each(["v2:keyboard", "v2:control"])(
    "a %s freeze stored by another tab after the start wins when motion comes back",
    async (value) => {
      const { container } = await tapStarted();
      await setMq(LAPTOP, false);
      window.localStorage.setItem(FREEZE_STORAGE_KEY, value);
      await setMq(LAPTOP, true);
      expect(heroFreeze().get()).toBe(true);
      fireEvent.click(container.querySelector(".scene-still_img")!);
      expect(heroFreeze().get()).toBe(true);
      expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBe(value);
      expect(net.fetched()).toEqual(["typing"]);
    },
  );

  it("reduced motion after the start: no player, nothing fetched again, even back at laptop width", async () => {
    const { container } = await tapStarted();
    await setMq(REDUCE, true);
    expect(hero(container)).toBeNull();
    await narrowAndBack(container);
    expect(hero(container)).toBeNull();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    fireEvent.click(container.querySelector(".scene-still_img")!);
    await wait(400);
    expect(hero(container)).toBeNull();
    expect(net.fetched()).toEqual(["typing"]);
  });

  it("Save-Data after the start: no player when motion would come back", async () => {
    const { container } = await tapStarted();
    await setMq(LAPTOP, false);
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { effectiveType: "4g", saveData: true },
    });
    await setMq(LAPTOP, true);
    expect(hero(container)).toBeNull();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(net.fetched()).toEqual(["typing"]);
  });

  it("a new visit (page load) gate-freezes again: the start is not persisted", async () => {
    const first = await tapStarted();
    first.unmount();
    expect(window.sessionStorage.length).toBe(0);
    expect(window.localStorage.getItem(FREEZE_STORAGE_KEY)).toBeNull();
    // A reload: new module state for the freeze store, gate and media.
    resetHeroFreezeForTests();
    resetHeroGateForTests();
    resetHeroVisitForTests();
    net = installFakeNet();
    const { container } = await gateFrozen();
    expect(hero(container)).toBeNull();
    expect(net.fetched()).toEqual([]);
  });
});
