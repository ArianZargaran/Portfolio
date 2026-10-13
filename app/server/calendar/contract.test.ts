/**
 * Contract test: every CalendarProvider implementation must pass the same
 * suite (see types.ts). Each adapter turns the shared fixture into what the
 * real backend would serve (an .ics feed, Google API JSON, or memory).
 */
import { generateKeyPairSync } from "node:crypto";

import { zonedWallTimeToDate } from "../time.server";

import { GoogleCalendarProvider } from "./google.server";
import { IcalCalendarProvider } from "./ical.server";
import { MockCalendarProvider } from "./mock";
import type { CalendarProvider } from "./types";
import { CalendarUnavailableError } from "./types";

const CHI = "America/Chicago";
const chi = (d: number, h: number, mi = 0, mo = 10, y = 2026) =>
  zonedWallTimeToDate(y, mo, d, h, mi, 0, CHI);

interface FixtureEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  location?: string;
  allDay?: boolean;
  cancelled?: boolean;
  /** Daily recurrence for N days (inclusive of the first). */
  dailyCount?: number;
  description?: string;
  attendees?: string[];
}

const FIXTURE: FixtureEvent[] = [
  {
    uid: "a",
    summary: "home-office.desk.coding.*.*.v3",
    start: chi(13, 9),
    end: chi(13, 11),
    description: "TICKET-123 private notes",
    attendees: ["someone@example.com"],
  },
  {
    uid: "b",
    summary: "office.desk.designing.noon.clear.v1",
    start: chi(13, 10),
    end: chi(13, 12),
    location: "40.4168,-3.7038",
  },
  {
    uid: "c",
    summary: "home-office.bed.resting.night.clear.v1",
    start: chi(13, 0),
    end: chi(14, 0),
    allDay: true,
  },
  {
    uid: "d",
    summary: "home-office.couch.reading.*.*.v1",
    start: chi(13, 14),
    end: chi(13, 15),
    cancelled: true,
  },
  // Daily 07:00-08:00 Chicago, 5 occurrences, crossing nothing special.
  {
    uid: "e",
    summary: "home-office.kitchen.eating.morning.*.v1",
    start: chi(12, 7),
    end: chi(12, 8),
    dailyCount: 5,
  },
  // Daily across the fall-back DST change: 08:00 local stays 08:00 local.
  {
    uid: "f",
    summary: "home-office.window.thinking.*.*.v1",
    start: chi(30, 8),
    end: chi(30, 8, 30),
    dailyCount: 5,
  },
];

function expand(e: FixtureEvent): FixtureEvent[] {
  if (!e.dailyCount) return [e];
  const s = new Date(e.start);
  return Array.from({ length: e.dailyCount }, (_, i) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: CHI,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(s);
    const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const start = zonedWallTimeToDate(
      g("year"),
      g("month"),
      g("day") + i,
      g("hour"),
      g("minute"),
      0,
      CHI,
    );
    return {
      ...e,
      dailyCount: undefined,
      start,
      end: new Date(start.getTime() + (e.end.getTime() - e.start.getTime())),
    };
  });
}

const icsDate = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const icsLocal = (d: Date) => {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}${g("month")}${g("day")}T${g("hour")}${g("minute")}${g("second")}`;
};

function toIcs(events: FixtureEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
    "X-WR-TIMEZONE:America/Chicago",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}`);
    if (e.allDay) {
      lines.push(
        `DTSTART;VALUE=DATE:${icsLocal(e.start).slice(0, 8)}`,
        `DTEND;VALUE=DATE:${icsLocal(e.end).slice(0, 8)}`,
      );
    } else if (e.dailyCount) {
      lines.push(
        `DTSTART;TZID=America/Chicago:${icsLocal(e.start)}`,
        `DTEND;TZID=America/Chicago:${icsLocal(e.end)}`,
        `RRULE:FREQ=DAILY;COUNT=${e.dailyCount}`,
      );
    } else {
      lines.push(
        `DTSTART;TZID=America/Chicago:${icsLocal(e.start)}`,
        `DTEND:${icsDate(e.end)}`,
      );
    }
    lines.push(`SUMMARY:${e.summary}`);
    if (e.location) lines.push(`LOCATION:${e.location.replace(/,/g, "\\,")}`);
    if (e.description) lines.push(`DESCRIPTION:${e.description}`);
    for (const a of e.attendees ?? []) lines.push(`ATTENDEE;CN=x:mailto:${a}`);
    if (e.cancelled) lines.push("STATUS:CANCELLED");
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:-P0DT0H10M0S",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  // fold long lines like real feeds do
  return lines
    .map((l) => (l.length > 75 ? l.match(/.{1,74}/g)!.join("\r\n ") : l))
    .join("\r\n");
}

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

function googleFake(
  events: FixtureEvent[],
  { failing = false } = {},
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (failing) return new Response("nope", { status: 503 });
    if (url.href.startsWith("https://oauth2.googleapis.com/token")) {
      const assertion = new URLSearchParams(String(init?.body)).get(
        "assertion",
      )!;
      const claims = JSON.parse(
        Buffer.from(assertion.split(".")[1], "base64url").toString(),
      );
      expect(claims.scope).toBe(
        "https://www.googleapis.com/auth/calendar.events.readonly",
      );
      return Response.json({ access_token: "tok", expires_in: 3600 });
    }
    expect(url.searchParams.get("singleEvents")).toBe("true");
    const min = Date.parse(url.searchParams.get("timeMin")!);
    const max = Date.parse(url.searchParams.get("timeMax")!);
    const items = events
      .flatMap(expand)
      .filter((e) => e.start.getTime() < max && e.end.getTime() > min)
      .map((e) => ({
        summary: e.summary,
        location: e.location,
        status: e.cancelled ? "cancelled" : "confirmed",
        description: e.description, // a real API with fields= would omit; provider must drop it anyway
        start: e.allDay
          ? { date: icsLocal(e.start).slice(0, 8) }
          : { dateTime: e.start.toISOString(), timeZone: CHI },
        end: e.allDay
          ? { date: icsLocal(e.end).slice(0, 8) }
          : { dateTime: e.end.toISOString() },
      }));
    return Response.json({ items });
  }) as typeof fetch;
}

type Factory = (
  events: FixtureEvent[],
  o?: { failing?: boolean },
) => CalendarProvider;

const providers: [string, Factory][] = [
  [
    "mock",
    (events, o) => {
      const p = new MockCalendarProvider(events.flatMap(expand));
      p.fail = !!o?.failing;
      return p;
    },
  ],
  [
    "ical",
    (events, o) =>
      new IcalCalendarProvider(
        "https://calendar.google.com/calendar/ical/x/private-secret/basic.ics",
        {
          fetchImpl: (async () =>
            o?.failing
              ? new Response("", { status: 500 })
              : new Response(toIcs(events), {
                  headers: { "Content-Type": "text/calendar" },
                })) as typeof fetch,
          log: () => undefined,
        },
      ),
  ],
  [
    "google",
    (events, o) =>
      new GoogleCalendarProvider(
        {
          clientEmail: "sa@project.iam.gserviceaccount.com",
          privateKey: PEM,
          calendarId: "scenes@group.calendar.google.com",
        },
        { fetchImpl: googleFake(events, o) },
      ),
  ],
];

const summaries = async (p: CalendarProvider, d: Date) =>
  (await p.eventsAt(d)).map((e) => e.summary).sort();

describe.each(providers)("CalendarProvider contract: %s", (_name, make) => {
  it("returns the event covering now, with only whitelisted fields", async () => {
    const p = make(FIXTURE);
    const events = await p.eventsAt(chi(13, 9, 30));
    expect(events.map((e) => e.summary)).toEqual([
      "home-office.desk.coding.*.*.v3",
    ]);
    const e = events[0];
    expect(Object.keys(e).sort()).toEqual(
      expect.arrayContaining(["end", "start", "summary"]),
    );
    for (const k of Object.keys(e))
      expect(["summary", "start", "end", "location", "timeZone"]).toContain(k);
    expect(JSON.stringify(events)).not.toMatch(
      /TICKET|someone@example|private notes/,
    );
    expect(e.start.getTime()).toBe(chi(13, 9).getTime());
    expect(e.end.getTime()).toBe(chi(13, 11).getTime());
  });

  it("returns overlapping events and keeps location", async () => {
    const events = await make(FIXTURE).eventsAt(chi(13, 10, 30));
    expect(events.map((e) => e.summary).sort()).toEqual([
      "home-office.desk.coding.*.*.v3",
      "office.desk.designing.noon.clear.v1",
    ]);
    expect(events.find((e) => e.location)?.location).toBe("40.4168,-3.7038");
  });

  it("treats end as exclusive and start as inclusive", async () => {
    const p = make(FIXTURE);
    expect(await summaries(p, chi(13, 11, 0))).toEqual([
      "office.desk.designing.noon.clear.v1",
    ]);
    expect(await summaries(p, chi(13, 12, 0))).toEqual([]);
  });

  it("excludes all-day and cancelled events", async () => {
    const p = make(FIXTURE);
    expect(await summaries(p, chi(13, 3))).toEqual([]);
    expect(await summaries(p, chi(13, 14, 30))).toEqual([]);
  });

  it("expands daily recurrences, respecting COUNT", async () => {
    const p = make(FIXTURE);
    expect(await summaries(p, chi(14, 7, 30))).toEqual([
      "home-office.kitchen.eating.morning.*.v1",
    ]);
    expect(await summaries(p, chi(16, 7, 59))).toEqual([
      "home-office.kitchen.eating.morning.*.v1",
    ]);
    expect(await summaries(p, chi(17, 7, 30))).toEqual([]);
  });

  it("keeps recurring wall-clock times across the DST change", async () => {
    const p = make(FIXTURE);
    // 2026-11-01 is fall-back day; 08:15 local must still match.
    expect(await summaries(p, chi(1, 8, 15, 11))).toEqual([
      "home-office.window.thinking.*.*.v1",
    ]);
    expect(await summaries(p, chi(2, 8, 15, 11))).toEqual([
      "home-office.window.thinking.*.*.v1",
    ]);
    expect(await summaries(p, chi(2, 7, 15, 11))).toEqual([]);
  });

  it("returns [] for an empty calendar", async () => {
    expect(await make([]).eventsAt(chi(13, 9))).toEqual([]);
  });

  it("throws CalendarUnavailableError on outage", async () => {
    await expect(
      make(FIXTURE, { failing: true }).eventsAt(chi(13, 9)),
    ).rejects.toBeInstanceOf(CalendarUnavailableError);
  });
});

describe("ical specifics", () => {
  it("does not leak the secret URL in errors", async () => {
    const url =
      "https://calendar.google.com/calendar/ical/x/private-SECRET123/basic.ics";
    const p = new IcalCalendarProvider(url, {
      fetchImpl: (async () => {
        throw new Error(`fetch failed for ${url}`);
      }) as typeof fetch,
    });
    const err = await p.eventsAt(new Date()).then(
      () => new Error("expected failure"),
      (e: Error) => e,
    );
    expect(err.message).not.toContain("SECRET123");
  });

  it("rejects a non-https URL", () => {
    expect(
      () => new IcalCalendarProvider("http://example.com/x.ics"),
    ).toThrow();
  });

  it("throws on a non-iCal body", async () => {
    const p = new IcalCalendarProvider("https://x.test/a.ics", {
      fetchImpl: (async () => new Response("<html>")) as typeof fetch,
    });
    await expect(p.eventsAt(new Date())).rejects.toBeInstanceOf(
      CalendarUnavailableError,
    );
  });

  it("caches the feed for the TTL", async () => {
    let t = 0;
    const fetchImpl = vi.fn(async () => new Response(toIcs(FIXTURE)));
    const p = new IcalCalendarProvider("https://x.test/a.ics", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => t,
      ttlMs: 60_000,
    });
    await p.eventsAt(chi(13, 9));
    t = 59_000;
    await p.eventsAt(chi(13, 9));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    t = 61_000;
    await p.eventsAt(chi(13, 9));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("propagates TZID as timeZone", async () => {
    const p = new IcalCalendarProvider("https://x.test/a.ics", {
      fetchImpl: (async () => new Response(toIcs(FIXTURE))) as typeof fetch,
    });
    const [e] = await p.eventsAt(chi(13, 9, 30));
    expect(e.timeZone).toBe("America/Chicago");
  });
});
