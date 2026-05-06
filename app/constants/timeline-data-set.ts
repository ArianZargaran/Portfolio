/**
 * Source of timeline events for the about-me route. Append an entry to extend
 * the timeline; the page simply gets taller and the horizontal illustrations
 * track pans proportionally over the new total scroll height. Illustration
 * opacity is purely positional — each illustration peaks at full opacity when
 * centered in the window and fades out before its edges touch the frame, so
 * adding events does not require any change to `illustrations-track.tsx`.
 */
export interface TimelineEntry {
  id: string;
  headline: string;
  description: string;
  date: string;
}

export const data: TimelineEntry[] = [
  {
    id: "first-video-2017-08-30",
    headline: "Published First Video",
    description:
      "My first YouTube video was a tutorial on how to build a client-server sockets app in Java.",
    date: "August 30, 2017",
  },
  {
    id: "first-video-2017-08-31",
    headline: "Published First Video",
    description:
      "My first YouTube video was a tutorial on how to build a client-server sockets app in Java.",
    date: "August 31, 2017",
  },
  {
    id: "first-video-2017-07-01",
    headline: "Published First Video",
    description:
      "My first YouTube video was a tutorial on how to build a client-server sockets app in Java.",
    date: "July 01, 2017",
  },
  {
    id: "first-video-2017-07-02",
    headline: "Published First Video",
    description:
      "My first YouTube video was a tutorial on how to build a client-server sockets app in Java.",
    date: "July 02, 2017",
  },
  {
    id: "first-video-2017-07-03",
    headline: "Published First Video",
    description:
      "My first YouTube video was a tutorial on how to build a client-server sockets app in Java.",
    date: "July 03, 2017",
  },
  {
    id: "first-video-2017-07-04",
    headline: "Published First Video",
    description:
      "My first YouTube video was a tutorial on how to build a client-server sockets app in Java.",
    date: "July 04, 2017",
  },
  {
    id: "first-video-2017-07-05",
    headline: "Published First Video",
    description:
      "My first YouTube video was a tutorial on how to build a client-server sockets app in Java.",
    date: "July 05, 2017",
  },
  {
    id: "first-video-2017-07-06",
    headline: "Published First Video",
    description:
      "My first YouTube video was a tutorial on how to build a client-server sockets app in Java.",
    date: "July 06, 2017",
  },
  {
    id: "to-be-continued",
    headline: "",
    description: "",
    date: "To be continued...",
  },
];
