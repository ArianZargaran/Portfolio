import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SocialNav } from "./social-nav";

describe("SocialNav", () => {
  it("renders a nav element containing exactly 5 links", () => {
    render(<SocialNav />);
    const nav = screen.getByRole("navigation");
    expect(nav).toBeDefined();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
  });

  it("renders each link with the correct href from the LOGOS data", () => {
    render(<SocialNav />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("https://x.com/arianfront");
    expect(hrefs).toContain("tel:408-809-6343");
    expect(hrefs).toContain("https://github.com/arianzargaran");
    expect(hrefs).toContain("https://www.linkedin.com/in/arianzf/");
    expect(hrefs).toContain("mailto:hello@ari.soy");
  });

  it("sets target=_blank and rel=noreferrer on the 3 https links", () => {
    render(<SocialNav />);
    const links = screen.getAllByRole("link");
    const externalLinks = links.filter((l) =>
      l.getAttribute("href")?.startsWith("https://")
    );
    expect(externalLinks).toHaveLength(3);
    for (const link of externalLinks) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noreferrer");
    }
  });

  it("does not set target or rel on the tel: link", () => {
    render(<SocialNav />);
    const links = screen.getAllByRole("link");
    const telLink = links.find((l) =>
      l.getAttribute("href")?.startsWith("tel:")
    );
    expect(telLink).toBeDefined();
    expect(telLink!.getAttribute("target")).toBeNull();
    expect(telLink!.getAttribute("rel")).toBeNull();
  });

  it("does not set target or rel on the mailto: link", () => {
    render(<SocialNav />);
    const links = screen.getAllByRole("link");
    const mailtoLink = links.find((l) =>
      l.getAttribute("href")?.startsWith("mailto:")
    );
    expect(mailtoLink).toBeDefined();
    expect(mailtoLink!.getAttribute("target")).toBeNull();
    expect(mailtoLink!.getAttribute("rel")).toBeNull();
  });

  it("merges a custom className with the base social-nav class on the nav element", () => {
    render(<SocialNav className="my-class" />);
    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("social-nav");
    expect(nav.className).toContain("my-class");
  });

  it("renders exactly 5 list items inside the nav", () => {
    render(<SocialNav />);
    const nav = screen.getByRole("navigation");
    const items = nav.querySelectorAll("li");
    expect(items).toHaveLength(5);
  });
});
