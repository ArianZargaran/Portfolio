/**
 * Calendar provider contract. Every provider is READ-ONLY and returns only
 * the minimum fields the scene resolver needs. Titles here are scene IDs by
 * convention (docs/calendar-event.schema.json), but providers must not trust
 * or interpret them; the resolver validates.
 *
 * Contract (enforced by contract.test.ts for every implementation):
 * - eventsAt(now) returns the timed events whose [start, end) contains `now`.
 * - All-day events and cancelled events are excluded.
 * - Recurring events are expanded to the occurrence covering `now`.
 * - Returned objects carry ONLY the fields below (no description,
 *   attendees, organiser, ids, links).
 * - On outage / bad credentials / unparseable feed it throws
 *   CalendarUnavailableError; it never returns partial garbage.
 */
export interface CalendarEvent {
  summary: string;
  start: Date;
  end: Date;
  location?: string;
  /** IANA zone the event was authored in (iCal TZID / Google start.timeZone). */
  timeZone?: string;
}

export interface CalendarProvider {
  readonly name: "ical" | "google" | "mock" | "none";
  eventsAt(now: Date): Promise<CalendarEvent[]>;
}

export class CalendarUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CalendarUnavailableError";
  }
}

export const pickFields = (e: CalendarEvent): CalendarEvent => ({
  summary: e.summary,
  start: e.start,
  end: e.end,
  ...(e.location ? { location: e.location } : {}),
  ...(e.timeZone ? { timeZone: e.timeZone } : {}),
});
