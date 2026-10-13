import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";

import ContactPage, { loader as contactLoader } from "./contact";
import ResumePage, { loader as resumeLoader } from "./resume";

const renderAt = async (path: string) => {
  const Stub = createRoutesStub([
    { path: "/resume", Component: ResumePage, loader: resumeLoader },
    { path: "/contact", Component: ContactPage, loader: contactLoader },
    { path: "/", Component: () => null },
  ]);
  render(<Stub initialEntries={[path]} />);
  await screen.findByRole("heading", { level: 1 });
};

describe("/resume", () => {
  it("renders the resume from typed data with one h1 and landmark", async () => {
    await renderAt("/resume");
    expect(
      screen.getByRole("heading", { level: 1, name: "Resume" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAccessibleName("Resume");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const exp = screen.getByRole("region", { name: "Experience" });
    expect(
      within(exp).getByRole("heading", {
        name: /Senior Front-End Engineer, Airtable/,
      }),
    ).toBeInTheDocument();
    expect(
      within(exp)
        .getAllByText("Oct 2021")
        .some((el) => el.getAttribute("datetime") === "2021-10"),
    ).toBe(true);
    expect(
      screen.getByRole("link", { name: /Download the resume/ }),
    ).toHaveAttribute("href", "/arian-zargaran-resume.pdf");
  });

  it("uses the v3.2 still as a decorative placeholder", async () => {
    await renderAt("/resume");
    // Decorative (alt="") images have role "presentation".
    const img = screen.getByRole("presentation");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute(
      "src",
      expect.stringContaining("home-office.desk.coding.dusk.clear.v3.2"),
    );
  });
});

describe("/contact", () => {
  it("shows hello@ari.soy and no phone link", async () => {
    await renderAt("/contact");
    expect(
      screen.getByRole("link", { name: "Email hello@ari.soy" }),
    ).toHaveAttribute("href", "mailto:hello@ari.soy");
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.some((h) => h.startsWith("tel:"))).toBe(false);
    expect(document.body).not.toHaveTextContent(/gmail/);
  });

  it("labels new-tab links and has a polite live region for copy feedback", async () => {
    await renderAt("/contact");
    expect(
      screen.getByRole("link", { name: /GitHub \(opens in a new tab\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
