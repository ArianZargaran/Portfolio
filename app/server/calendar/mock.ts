import type { CalendarEvent, CalendarProvider } from "./types";
import { CalendarUnavailableError, pickFields } from "./types";

export interface MockEvent extends CalendarEvent {
  allDay?: boolean;
  cancelled?: boolean;
  /** Extra private data a real calendar would hold; must never leak. */
  description?: string;
  attendees?: string[];
}

/** In-memory provider for local dev and tests. `fail = true` simulates an outage. */
export class MockCalendarProvider implements CalendarProvider {
  readonly name = "mock" as const;
  fail = false;
  constructor(public events: MockEvent[] = []) {}

  async eventsAt(now: Date): Promise<CalendarEvent[]> {
    if (this.fail) throw new CalendarUnavailableError("mock outage");
    const t = now.getTime();
    return this.events
      .filter((e) => !e.allDay && !e.cancelled)
      .filter((e) => e.start.getTime() <= t && t < e.end.getTime())
      .map(pickFields);
  }
}

/** Provider used when nothing is configured: always empty -> default scene. */
export class NoCalendarProvider implements CalendarProvider {
  readonly name = "none" as const;
  async eventsAt(): Promise<CalendarEvent[]> {
    return [];
  }
}
