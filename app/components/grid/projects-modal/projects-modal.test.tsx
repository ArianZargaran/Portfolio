import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectsModal } from "./index";

vi.mock("./airtable", () => ({
  default: ({
    onClose,
    isOpen,
  }: {
    onClose?: () => void;
    isOpen?: boolean;
  }) => (
    <div data-testid="airtable-content" data-open={String(isOpen ?? false)}>
      <button type="button" onClick={onClose}>
        x
      </button>
    </div>
  ),
}));

vi.mock("./animatea", () => ({
  default: ({
    onClose,
    isOpen,
  }: {
    onClose?: () => void;
    isOpen?: boolean;
  }) => (
    <div data-testid="animatea-content" data-open={String(isOpen ?? false)}>
      <button type="button" onClick={onClose}>
        x
      </button>
    </div>
  ),
}));

vi.mock("./apple", () => ({
  default: ({
    onClose,
    isOpen,
  }: {
    onClose?: () => void;
    isOpen?: boolean;
  }) => (
    <div data-testid="apple-content" data-open={String(isOpen ?? false)}>
      <button type="button" onClick={onClose}>
        x
      </button>
    </div>
  ),
}));

vi.mock("./cabify", () => ({
  default: ({
    onClose,
    isOpen,
  }: {
    onClose?: () => void;
    isOpen?: boolean;
  }) => (
    <div data-testid="cabify-content" data-open={String(isOpen ?? false)}>
      <button type="button" onClick={onClose}>
        x
      </button>
    </div>
  ),
}));

vi.mock("./newsela", () => ({
  default: ({
    onClose,
    isOpen,
  }: {
    onClose?: () => void;
    isOpen?: boolean;
  }) => (
    <div data-testid="newsela-content" data-open={String(isOpen ?? false)}>
      <button type="button" onClick={onClose}>
        x
      </button>
    </div>
  ),
}));

vi.mock("./repleat", () => ({
  default: ({
    onClose,
    isOpen,
  }: {
    onClose?: () => void;
    isOpen?: boolean;
  }) => (
    <div data-testid="repleat-content" data-open={String(isOpen ?? false)}>
      <button type="button" onClick={onClose}>
        x
      </button>
    </div>
  ),
}));

vi.mock("./roll", () => ({
  default: ({
    onClose,
    isOpen,
  }: {
    onClose?: () => void;
    isOpen?: boolean;
  }) => (
    <div data-testid="roll-content" data-open={String(isOpen ?? false)}>
      <button type="button" onClick={onClose}>
        x
      </button>
    </div>
  ),
}));

vi.mock("./walmart", () => ({
  default: ({
    onClose,
    isOpen,
  }: {
    onClose?: () => void;
    isOpen?: boolean;
  }) => (
    <div data-testid="walmart-content" data-open={String(isOpen ?? false)}>
      <button type="button" onClick={onClose}>
        x
      </button>
    </div>
  ),
}));

describe("ProjectsModal", () => {
  it("renders nothing when selectedProject is undefined", () => {
    const { container } = render(<ProjectsModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the airtable content stub when selectedProject is airtable", async () => {
    const { findByTestId } = render(<ProjectsModal selectedProject="airtable" />);
    const el = await findByTestId("airtable-content");
    expect(el).toBeInTheDocument();
  });

  it("renders the roll content stub when selectedProject is initiative-roll", async () => {
    const { findByTestId } = render(
      <ProjectsModal selectedProject="initiative-roll" />,
    );
    const el = await findByTestId("roll-content");
    expect(el).toBeInTheDocument();
  });

  it("forwards onClose to the rendered child so clicking the close button calls the spy", async () => {
    const onClose = vi.fn();
    const { findByTestId } = render(
      <ProjectsModal selectedProject="airtable" onClose={onClose} />,
    );
    const stub = await findByTestId("airtable-content");
    const closeBtn = stub.querySelector("button") as HTMLButtonElement;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("always passes isOpen as true to the child component", async () => {
    const { findByTestId } = render(
      <ProjectsModal selectedProject="airtable" isOpen={false} />,
    );
    const el = await findByTestId("airtable-content");
    expect(el).toHaveAttribute("data-open", "true");
  });

  it("renders the walmart content stub when selectedProject is walmart", async () => {
    const { findByTestId } = render(
      <ProjectsModal selectedProject="walmart" />,
    );
    const el = await findByTestId("walmart-content");
    expect(el).toBeInTheDocument();
  });

  it("renders the cabify content stub when selectedProject is cabify", async () => {
    const { findByTestId } = render(
      <ProjectsModal selectedProject="cabify" />,
    );
    const el = await findByTestId("cabify-content");
    expect(el).toBeInTheDocument();
  });
});
