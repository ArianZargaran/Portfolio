import type { Option } from "~/components/main-menu-nav/main-menu-nav-item";

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
    href: "/about-me",
    theme: "about",
  },
  {
    id: "ID3",
    option: "Projects",
    caption: "Thoughts go LIVE: My code in action.",
    href: "/projects",
    theme: "projects",
  },
  {
    id: "ID4",
    option: "Skills",
    caption: "Tools and Tech to deliver excellence.",
    href: "/skills",
    theme: "skills",
  },
];
