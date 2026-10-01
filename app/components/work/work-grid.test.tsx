import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkCardTile } from "./work-card";
import { WorkGrid } from "./work-grid";

afterEach(() => {
  vi.useRealTimers();
});

/** Step past one CSS-transition-driven choreography phase (its duration + a
    hair). Only for the open path (vacating/open) and the post-body-exit part
    of closing (leaving/settling) — all plain CSS transitions on a timer. */
const advancePhase = () =>
  act(() => {
    vi.advanceTimersByTime(400);
  });

describe("WorkGrid", () => {
  it("renders all 15 work cards across 5 rows", () => {
    render(<WorkGrid />);
    expect(screen.getAllByTestId("work-card")).toHaveLength(15);
    expect(screen.getAllByTestId("work-row")).toHaveLength(5);
  });

  it("expands a card through the vacating phase, then shows its blocks", () => {
    vi.useFakeTimers();
    render(<WorkGrid />);
    const button = screen.getByRole("button", {
      name: /expand design systems card/i,
    });
    fireEvent.click(button);
    /* Vacating phase: the card is active but the body waits until its row
       has been handed over. */
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.queryByText(/still in use past my tenure/i),
    ).not.toBeInTheDocument();

    advancePhase();
    expect(
      screen.getByText(/still in use past my tenure/i),
    ).toBeInTheDocument();
  });

  it("collapses the expanded card only after the body genuinely finishes exiting", async () => {
    /* Real timers for this one: the step out of "closing" is driven by
       Framer's actual onExitComplete event (not a matching setTimeout — see
       work-grid.tsx), and fake timers can't manufacture that event. This is
       the same reason the fix exists: a duration guess kept racing the real
       animation and made the body's disappearance overlap the row
       rearranging instead of running as two clean, separate beats. */
    render(<WorkGrid />);
    fireEvent.click(
      screen.getByRole("button", { name: /expand an honest failure card/i }),
    );
    /* Wait for the card to actually finish opening (body visible), not just
       for the label to say "collapse" — that flips as soon as "vacating"
       starts, well before "open". A click during any transient phase is
       now correctly ignored (see work-grid.tsx), so clicking collapse
       before the card has truly settled open would be a no-op here too,
       same as it would be for a real user. */
    await screen.findByText(/scars behind them/i);

    const button = screen.getByRole("button", {
      name: /collapse an honest failure card/i,
    });
    fireEvent.click(button);
    /* Still pinned immediately after the click — closing hasn't finished. */
    expect(button).toHaveAttribute("aria-expanded", "true");

    await waitFor(
      () =>
        expect(
          screen.getByRole("button", {
            name: /expand an honest failure card/i,
          }),
        ).toHaveAttribute("aria-expanded", "false"),
      { timeout: 3000 },
    );
  });

  it("lets multiple cards stay open at once, each closing independently", async () => {
    vi.useFakeTimers();
    render(<WorkGrid />);
    fireEvent.click(
      screen.getByRole("button", { name: /expand design systems card/i }),
    );
    advancePhase();
    fireEvent.click(
      screen.getByRole("button", { name: /expand giving back card/i }),
    );
    advancePhase();

    /* No auto-close: opening the second card leaves the first one open. */
    expect(
      screen.getByText(/still in use past my tenure/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/startup in disguise/i)).toBeInTheDocument();
    const expanded = screen
      .getAllByTestId("work-card")
      .filter((card) =>
        card
          .querySelector("button")
          ?.getAttribute("aria-expanded")
          ?.includes("true"),
      );
    expect(expanded).toHaveLength(2);

    /* Closing one card does not touch the other. Real timers again, for the
       same onExitComplete reason as above. */
    vi.useRealTimers();
    fireEvent.click(
      screen.getByRole("button", { name: /collapse design systems card/i }),
    );
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: /expand design systems card/i }),
        ).toHaveAttribute("aria-expanded", "false"),
      { timeout: 3000 },
    );
    expect(
      screen.getByRole("button", { name: /collapse giving back card/i }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/startup in disguise/i)).toBeInTheDocument();
  });

  it("ignores a click that lands mid-transition instead of desyncing", () => {
    /* Regression test: a click during "vacating" (before the card has
       actually reached "open") used to be misread as "currently open,
       close it" — silently restarting the wrong chain and leaving the
       card in the opposite of the intended final state. Clicks during any
       transient phase must now be no-ops; only the click that lands once
       the card has truly opened should register. */
    vi.useFakeTimers();
    render(<WorkGrid />);
    const button = screen.getByRole("button", {
      name: /expand design systems card/i,
    });
    fireEvent.click(button); // -> vacating
    fireEvent.click(button); // mid-transition: must be ignored
    fireEvent.click(button); // mid-transition: must be ignored

    advancePhase(); // vacating -> open
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/still in use past my tenure/i),
    ).toBeInTheDocument();
  });

  it("holds the media slot with a pending panel when a card has no images", () => {
    /* All 11 real cards now have an image (see work-cards.ts), so this
       exercises the pending-panel behavior directly against a synthetic
       card instead of depending on some real card staying asset-less. */
    render(
      <WorkCardTile
        card={{
          id: "placeholder",
          slug: "placeholder",
          eyebrow: "PLACEHOLDER",
          signal: "Signal",
          meta: "",
          images: [],
          blocks: [],
        }}
        isExpanded={false}
        anyExpanded={false}
        showBody={false}
        stateClass=""
        onBodyExitComplete={() => {}}
        onToggle={() => {}}
      />,
    );
    expect(
      document.querySelector(".work-card_media.is-pending"),
    ).not.toBeNull();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  describe("URL sync (routeOpenId / onOpenIdChange)", () => {
    it("opens the matching card on mount when routeOpenId names one, with no click", () => {
      vi.useFakeTimers();
      render(<WorkGrid routeOpenId="design-systems-brandkit" />);
      advancePhase();
      expect(
        screen.getByRole("button", { name: /collapse design systems card/i }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByText(/still in use past my tenure/i),
      ).toBeInTheDocument();
    });

    it("reports the newly-opened card id, then undefined once it's fully closed", async () => {
      const onOpenIdChange = vi.fn();
      render(<WorkGrid onOpenIdChange={onOpenIdChange} />);
      fireEvent.click(
        screen.getByRole("button", { name: /expand design systems card/i }),
      );
      await waitFor(() =>
        expect(onOpenIdChange).toHaveBeenCalledWith("design-systems-brandkit"),
      );

      fireEvent.click(
        screen.getByRole("button", {
          name: /collapse design systems card/i,
        }),
      );
      await waitFor(() =>
        expect(onOpenIdChange).toHaveBeenLastCalledWith(undefined),
      );
    });

    it("closes the open card when routeOpenId changes to null, as the back button would", async () => {
      const { rerender } = render(
        <WorkGrid routeOpenId="checkout-honest-failure" />,
      );
      await screen.findByText(/scars behind them/i);
      expect(
        screen.getByRole("button", {
          name: /collapse an honest failure card/i,
        }),
      ).toHaveAttribute("aria-expanded", "true");

      rerender(<WorkGrid routeOpenId={null} />);
      await waitFor(() =>
        expect(
          screen.getByRole("button", {
            name: /expand an honest failure card/i,
          }),
        ).toHaveAttribute("aria-expanded", "false"),
      );
    });

    it("doesn't undo a back-navigation close when onOpenIdChange's identity changes every render", async () => {
      /* Regression test: a real route wrapper recreates its onOpenIdChange
         callback on every render (it closes over location.pathname), which
         used to make the state -> URL effect re-fire with a stale
         `lastOpened` and re-navigate forward to the card that back just
         closed — see the ref guard in work-grid.tsx for the full story. A
         fresh function on every rerender, like the real wrapper, is the
         point of this test; a memoized mock would not reproduce the bug. */
      let calls = 0;
      const onOpenIdChange = vi.fn();
      const freshCallback = () => {
        calls += 1;
        return (id: string | undefined) => onOpenIdChange(id);
      };

      const { rerender } = render(
        <WorkGrid
          routeOpenId="checkout-honest-failure"
          onOpenIdChange={freshCallback()}
        />,
      );
      await screen.findByText(/scars behind them/i);
      expect(calls).toBeGreaterThan(0);
      // Legitimately called once with the open id already, from the initial
      // open above — only calls from here on are what this test is about.
      onOpenIdChange.mockClear();

      // The back button: the route now says nothing should be open, with a
      // brand-new callback instance, exactly like a real navigation.
      rerender(
        <WorkGrid routeOpenId={null} onOpenIdChange={freshCallback()} />,
      );
      await waitFor(() =>
        expect(
          screen.getByRole("button", {
            name: /expand an honest failure card/i,
          }),
        ).toHaveAttribute("aria-expanded", "false"),
      );

      // One more render with yet another fresh callback (simulating the
      // effect flush settling) must not report the closed card as open
      // again.
      rerender(
        <WorkGrid routeOpenId={null} onOpenIdChange={freshCallback()} />,
      );
      expect(onOpenIdChange).not.toHaveBeenCalledWith(
        "checkout-honest-failure",
      );
    });
  });
});
