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
  it("renders all 11 work cards across 5 rows", () => {
    render(<WorkGrid />);
    expect(screen.getAllByTestId("work-card")).toHaveLength(11);
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
    await waitFor(() =>
      expect(
        screen.getByText(/scars behind them/i),
      ).toBeInTheDocument(),
    );

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
});
