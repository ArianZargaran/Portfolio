import type { Option } from "~/components/main-menu-nav/main-menu-nav-item";
import type { Features } from "~/features";

/** Option ids gated by a feature flag. */
const GATED: Record<string, keyof Features> = { ID4: "skillsChat" };

/** Menu entries for the enabled features only (flags default off). */
export const menuOptionsFor = (features: Features): Option[] =>
  MAIN_MENU_OPTIONS.filter((o) => !GATED[o.id] || features[GATED[o.id]]);

export const MAIN_MENU_OPTIONS: Option[] = [
  {
    id: "ID1",
    option: "Home",
    caption: "Turning Interfaces into Experiences.",
    href: "/",
    theme: "home",
  },
  {
    id: "ID2",
    option: "About",
    caption: "Passion, Experience, and Commitment.",
    href: "/about",
    theme: "about",
  },
  {
    id: "ID3",
    option: "Work",
    caption: "Thoughts go LIVE: My code in action.",
    href: "/work",
    theme: "work",
  },
  {
    id: "ID4",
    option: "Skills",
    caption: "Tools and Tech to deliver excellence.",
    href: "/skills",
    theme: "skills",
  },
  {
    id: "ID5",
    option: "Contact",
    caption: "Let's build something together.",
    href: "/contact",
    theme: "contact",
  },
];
