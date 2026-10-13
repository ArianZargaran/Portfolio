/**
 * Read-only provider for the calendar's SECRET iCal address
 * (Google Calendar > Settings > Integrate calendar > "Secret address in iCal
 * format"). One env var: SCENE_CALENDAR_ICAL_URL. The URL is a credential:
 * never log it, never send it to the client. Rotating it in Google
 * ("Reset") invalidates the old one.
 *
 * Supported iCal subset (what Google exports): VEVENT with DTSTART/DTEND
 * (UTC, TZID or floating), DURATION, SUMMARY, LOCATION, STATUS, RRULE with
 * FREQ=DAILY|WEEKLY (INTERVAL, COUNT, UNTIL, BYDAY), EXDATE, and
 * RECURRENCE-ID overrides. Other RRULE frequencies are skipped and logged.
 */
import { isValidTimeZone, zonedWallTimeToDate } from "../time.server";

import type { CalendarEvent, CalendarProvider } from "./types";
import { CalendarUnavailableError, pickFields } from "./types";

type Fetch = typeof fetch;

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

interface RawEvent {
  uid?: string;
  summary: string;
  location?: string;
  status?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  timeZone?: string;
  rrule?: Record<string, string>;
  exdates: number[];
  recurrenceId?: number;
  /** Wall-clock components of DTSTART, to step recurrences across DST. */
  wall?: { y: number; mo: number; d: number; h: number; mi: number; s: number };
}

function unfold(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter(Boolean);
}

function parseProp(line: string): Prop | null {
  const colon = line.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  if (colon < 0) return null;
  const [name, ...rawParams] = line.slice(0, colon).split(";");
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const [k, v = ""] = p.split("=");
    params[k.toUpperCase()] = v.replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

const unescapeText = (v: string) =>
  v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");

function parseDate(p: Prop, defaultTz: string) {
  const v = p.value.trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(v);
  if (!m) throw new Error(`bad date ${p.name}`);
  const [, y, mo, d, h, mi, s, z] = m;
  const n = (x?: string) => (x ? Number(x) : 0);
  const allDay = p.params.VALUE === "DATE" || h === undefined;
  const wall = { y: n(y), mo: n(mo), d: n(d), h: n(h), mi: n(mi), s: n(s) };
  if (z) {
    return {
      date: new Date(
        Date.UTC(wall.y, wall.mo - 1, wall.d, wall.h, wall.mi, wall.s),
      ),
      allDay,
      wall,
      tz: "UTC",
    };
  }
  const tz = isValidTimeZone(p.params.TZID) ? p.params.TZID : defaultTz;
  return {
    date: zonedWallTimeToDate(
      wall.y,
      wall.mo,
      wall.d,
      wall.h,
      wall.mi,
      wall.s,
      tz,
    ),
    allDay,
    wall,
    tz,
  };
}

function parseDuration(v: string): number {
  const m =
    /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
      v.trim(),
    );
  if (!m) throw new Error("bad duration");
  const [, sign, w, d, h, mi, s] = m.map((x) => (x === undefined ? "0" : x));
  const ms = ((+w * 7 + +d) * 86400 + +h * 3600 + +mi * 60 + +s) * 1000;
  return sign === "-" ? -ms : ms;
}

export function parseIcs(
  text: string,
  fallbackTz = "America/Chicago",
): RawEvent[] {
  const lines = unfold(text);
  if (!lines[0]?.startsWith("BEGIN:VCALENDAR"))
    throw new Error("not an iCalendar feed");
  const calTzLine = lines.find((l) => l.startsWith("X-WR-TIMEZONE:"));
  const calTz = calTzLine?.slice("X-WR-TIMEZONE:".length).trim();
  const defaultTz = isValidTimeZone(calTz) ? calTz : fallbackTz;

  const events: RawEvent[] = [];
  let cur: Prop[] | null = null;
  let depth = 0;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = [];
      depth = 0;
      continue;
    }
    if (!cur) continue;
    if (line.startsWith("BEGIN:")) {
      depth++;
      continue;
    } // VALARM etc.
    if (line.startsWith("END:") && depth > 0) {
      depth--;
      continue;
    }
    if (line === "END:VEVENT") {
      const get = (n: string) => cur!.find((p) => p.name === n);
      const dtstart = get("DTSTART");
      if (dtstart) {
        const s = parseDate(dtstart, defaultTz);
        const dtend = get("DTEND");
        const dur = get("DURATION");
        const end = dtend
          ? parseDate(dtend, defaultTz).date
          : new Date(
              s.date.getTime() +
                (dur ? parseDuration(dur.value) : s.allDay ? 86400000 : 0),
            );
        const rr = get("RRULE");
        const rid = get("RECURRENCE-ID");
        events.push({
          uid: get("UID")?.value,
          summary: unescapeText(get("SUMMARY")?.value ?? ""),
          location: get("LOCATION")
            ? unescapeText(get("LOCATION")!.value)
            : undefined,
          status: get("STATUS")?.value.toUpperCase(),
          start: s.date,
          end,
          allDay: s.allDay,
          timeZone: s.tz === "UTC" ? undefined : s.tz,
          wall: s.wall,
          rrule: rr
            ? Object.fromEntries(
                rr.value
                  .split(";")
                  .map((kv) => kv.split("=") as [string, string]),
              )
            : undefined,
          exdates: cur
            .filter((p) => p.name === "EXDATE")
            .flatMap((p) =>
              p.value
                .split(",")
                .map((v) =>
                  parseDate({ ...p, value: v }, defaultTz).date.getTime(),
                ),
            ),
          recurrenceId: rid
            ? parseDate(rid, defaultTz).date.getTime()
            : undefined,
        });
      }
      cur = null;
      continue;
    }
    const p = parseProp(line);
    if (p) cur.push(p);
  }
  return events;
}

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** Occurrence of `ev` covering `now`, or null. Steps in wall-clock time so DST is respected. */
function occurrenceAt(
  ev: RawEvent,
  now: number,
  log: (m: string) => void,
): { start: Date; end: Date } | null {
  const dur = ev.end.getTime() - ev.start.getTime();
  if (!ev.rrule)
    return ev.start.getTime() <= now && now < ev.end.getTime() ? ev : null;
  const freq = ev.rrule.FREQ;
  if (freq !== "DAILY" && freq !== "WEEKLY") {
    log(`ical: unsupported RRULE FREQ=${freq}; event skipped`);
    return null;
  }
  const interval = Number(ev.rrule.INTERVAL ?? 1);
  const count = ev.rrule.COUNT ? Number(ev.rrule.COUNT) : Infinity;
  const until = ev.rrule.UNTIL
    ? parseDate(
        { name: "UNTIL", params: {}, value: ev.rrule.UNTIL },
        ev.timeZone ?? "UTC",
      ).date.getTime()
    : Infinity;
  const tz = ev.timeZone ?? "UTC";
  const w = ev.wall!;
  const byDay = ev.rrule.BYDAY?.split(",").map((d) =>
    DAYS.indexOf(d.slice(-2)),
  );
  const startDow = new Date(Date.UTC(w.y, w.mo - 1, w.d)).getUTCDay();
  const days = freq === "WEEKLY" ? (byDay?.length ? byDay : [startDow]) : null;

  let n = 0;
  for (let i = 0; i < 20000; i++) {
    const dayDate = new Date(Date.UTC(w.y, w.mo - 1, w.d + i));
    const dow = dayDate.getUTCDay();
    if (freq === "DAILY" && i % interval !== 0) continue;
    if (freq === "WEEKLY") {
      // week index relative to the week (Sunday-based, matching WKST=SU default of Google exports)
      const week = Math.floor((i + startDow) / 7);
      if (week % interval !== 0 || !days!.includes(dow)) continue;
    }
    const start = zonedWallTimeToDate(
      dayDate.getUTCFullYear(),
      dayDate.getUTCMonth() + 1,
      dayDate.getUTCDate(),
      w.h,
      w.mi,
      w.s,
      tz,
    ).getTime();
    if (start < ev.start.getTime()) continue;
    if (start > until || n >= count) return null;
    n++;
    if (start > now) return null;
    if (ev.exdates.includes(start)) continue;
    if (now < start + dur)
      return { start: new Date(start), end: new Date(start + dur) };
  }
  return null;
}

export class IcalCalendarProvider implements CalendarProvider {
  readonly name = "ical" as const;
  private cache?: { at: number; events: RawEvent[] };

  constructor(
    private readonly url: string,
    private readonly opts: {
      fetchImpl?: Fetch;
      ttlMs?: number;
      timeoutMs?: number;
      now?: () => number;
      log?: (m: string) => void;
    } = {},
  ) {
    if (!/^https:\/\//.test(url))
      throw new Error("SCENE_CALENDAR_ICAL_URL must be https");
  }

  private async feed(): Promise<RawEvent[]> {
    const now = (this.opts.now ?? Date.now)();
    const ttl = this.opts.ttlMs ?? 60_000;
    if (this.cache && now - this.cache.at < ttl) return this.cache.events;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.opts.timeoutMs ?? 2000);
    try {
      const res = await (this.opts.fetchImpl ?? fetch)(this.url, {
        signal: ctrl.signal,
        headers: { Accept: "text/calendar" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const events = parseIcs(await res.text());
      this.cache = { at: now, events };
      return events;
    } catch (cause) {
      // Never include the URL in the message: it is a secret.
      throw new CalendarUnavailableError("ical feed unavailable", { cause });
    } finally {
      clearTimeout(timer);
    }
  }

  async eventsAt(nowDate: Date): Promise<CalendarEvent[]> {
    const all = await this.feed();
    const now = nowDate.getTime();
    const log = this.opts.log ?? ((m: string) => console.warn(m));
    const overrides = all.filter((e) => e.recurrenceId !== undefined);
    const out: CalendarEvent[] = [];
    for (const ev of all) {
      if (ev.recurrenceId !== undefined) continue;
      if (ev.allDay) continue;
      const occ = occurrenceAt(ev, now, log);
      if (!occ) continue;
      const override = overrides.find(
        (o) => o.uid === ev.uid && o.recurrenceId === occ.start.getTime(),
      );
      if (override) continue; // handled below as its own instance
      if (ev.status === "CANCELLED") continue;
      out.push(
        pickFields({
          summary: ev.summary,
          start: occ.start,
          end: occ.end,
          location: ev.location,
          timeZone: ev.timeZone,
        }),
      );
    }
    for (const o of overrides) {
      if (o.allDay || o.status === "CANCELLED") continue;
      if (o.start.getTime() <= now && now < o.end.getTime()) {
        out.push(
          pickFields({
            summary: o.summary,
            start: o.start,
            end: o.end,
            location: o.location,
            timeZone: o.timeZone,
          }),
        );
      }
    }
    return out;
  }
}
