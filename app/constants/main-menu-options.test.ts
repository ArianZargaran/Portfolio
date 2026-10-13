import { MAIN_MENU_OPTIONS, menuOptionsFor } from "./main-menu-options";

const hrefs = (o: { href: string }[]) => o.map((x) => x.href);

describe("menuOptionsFor", () => {
  it("hides the Skills entry when the flag is off", () => {
    expect(hrefs(menuOptionsFor({ skillsChat: false }))).toEqual([
      "/",
      "/about",
      "/work",
      "/contact",
    ]);
  });
  it("shows it when the flag is on", () => {
    expect(hrefs(menuOptionsFor({ skillsChat: true }))).toEqual(
      hrefs(MAIN_MENU_OPTIONS),
    );
  });
});
