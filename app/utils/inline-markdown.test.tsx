import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderInlineMarkdown } from "./inline-markdown";

const renderText = (text: string) => render(<p>{renderInlineMarkdown(text)}</p>);

describe("renderInlineMarkdown", () => {
  it("returns plain text untouched", () => {
    renderText("Just a plain sentence.");
    expect(screen.getByText("Just a plain sentence.")).toBeInTheDocument();
  });

  it("renders **bold** as <strong>", () => {
    renderText("A **passion** was born.");
    const strong = screen.getByText("passion");
    expect(strong.tagName).toBe("STRONG");
  });

  it("renders *italic* as <em>", () => {
    renderText("Ride as the *gregario*.");
    const em = screen.getByText("gregario");
    expect(em.tagName).toBe("EM");
  });

  it("renders `code` as <code>", () => {
    renderText("Type `npm run dev` to start.");
    const code = screen.getByText("npm run dev");
    expect(code.tagName).toBe("CODE");
  });

  it("renders [label](url) as a safe external link", () => {
    renderText("Visit [my site](https://ari.soy) today.");
    const link = screen.getByRole("link", { name: "my site" });
    expect(link).toHaveAttribute("href", "https://ari.soy");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("handles multiple tokens in one string", () => {
    renderText("**Quality** is a need, *not* an option.");
    expect(screen.getByText("Quality").tagName).toBe("STRONG");
    expect(screen.getByText("not").tagName).toBe("EM");
  });

  it("does not treat a lone asterisk as emphasis", () => {
    renderText("Rated 5* by users");
    expect(screen.getByText("Rated 5* by users")).toBeInTheDocument();
  });
});
