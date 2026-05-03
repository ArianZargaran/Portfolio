import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import Modal from "./useModal";

// happy-dom does not implement <dialog>'s imperative API. Polyfill the bits
// the Modal effect actually touches: showModal/close mutate `open`, the
// `close` event fires when close() is called.
beforeAll(() => {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal: () => void;
    close: () => void;
  };
  if (typeof proto.showModal !== "function") {
    proto.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  }
  if (typeof proto.close !== "function") {
    proto.close = function close() {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
});

const getDialog = () =>
  screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;

describe("Modal (useModal)", () => {
  it("renders children and a Close CTA", () => {
    render(<Modal isOpen={false}>Hello world</Modal>);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
    // A closed <dialog> hides its contents from the accessibility tree.
    expect(
      screen.getByRole("button", { name: /close/i, hidden: true }),
    ).toBeInTheDocument();
  });

  it("calls showModal and onOpen when isOpen flips to true", () => {
    const onOpen = vi.fn();
    const { rerender } = render(
      <Modal isOpen={false} onOpen={onOpen}>
        body
      </Modal>,
    );

    const dialog = getDialog();
    const showSpy = vi.spyOn(dialog, "showModal");

    rerender(
      <Modal isOpen={true} onOpen={onOpen}>
        body
      </Modal>,
    );

    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute("open");
  });

  it("closes the dialog when isOpen flips to false", () => {
    const { rerender } = render(<Modal isOpen={true}>body</Modal>);
    const dialog = getDialog();
    const closeSpy = vi.spyOn(dialog, "close");

    rerender(<Modal isOpen={false}>body</Modal>);

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(dialog).not.toHaveAttribute("open");
  });

  it("does not call showModal again if the dialog is already open", () => {
    const { rerender } = render(<Modal isOpen={true}>body</Modal>);
    const dialog = getDialog();
    const showSpy = vi.spyOn(dialog, "showModal");

    rerender(<Modal isOpen={true}>body</Modal>);

    expect(showSpy).not.toHaveBeenCalled();
  });

  it("invokes onClose via the dialog's close event", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        body
      </Modal>,
    );

    const dialog = getDialog();
    fireEvent(dialog, new Event("close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes the dialog when the Close button is clicked", () => {
    render(<Modal isOpen={true}>body</Modal>);
    const dialog = getDialog();
    const closeSpy = vi.spyOn(dialog, "close");

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it("renders an appended CTA alongside the close button", () => {
    render(
      <Modal isOpen={false} appendedCta={<button>Custom action</button>}>
        body
      </Modal>,
    );
    expect(
      screen.getByRole("button", { name: /custom action/i, hidden: true }),
    ).toBeInTheDocument();
  });
});
