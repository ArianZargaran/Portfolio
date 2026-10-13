/**
 * Alternative read-only provider: Google Calendar API with a service account.
 * The scene calendar is shared with the service account as "See all event
 * details" (read-only); the token is requested with the read-only scope
 * calendar.events.readonly. Env: GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY (PEM,
 * "\n" escaped), SCENE_CALENDAR_ID. Only summary/location/start/end/status
 * are requested (fields=...), so nothing else ever reaches the server.
 */
import { createSign } from "node:crypto";

import type { CalendarEvent, CalendarProvider } from "./types";
import { CalendarUnavailableError, pickFields } from "./types";

type Fetch = typeof fetch;
export const GOOGLE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

export class GoogleCalendarProvider implements CalendarProvider {
  readonly name = "google" as const;
  private token?: { value: string; exp: number };

  constructor(
    private readonly cfg: {
      clientEmail: string;
      privateKey: string;
      calendarId: string;
    },
    private readonly opts: {
      fetchImpl?: Fetch;
      now?: () => number;
      timeoutMs?: number;
    } = {},
  ) {}

  private now = () => (this.opts.now ?? Date.now)();
  private get f(): Fetch {
    return this.opts.fetchImpl ?? fetch;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.exp - 60_000 > this.now())
      return this.token.value;
    const iat = Math.floor(this.now() / 1000);
    const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = b64url(
      JSON.stringify({
        iss: this.cfg.clientEmail,
        scope: GOOGLE_READONLY_SCOPE,
        aud: TOKEN_URL,
        iat,
        exp: iat + 3600,
      }),
    );
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    const sig = signer
      .sign(this.cfg.privateKey.replace(/\\n/g, "\n"))
      .toString("base64url");
    const res = await this.f(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${header}.${claims}.${sig}`,
      }),
    });
    if (!res.ok) throw new Error(`token HTTP ${res.status}`);
    const body = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.token = {
      value: body.access_token,
      exp: this.now() + body.expires_in * 1000,
    };
    return body.access_token;
  }

  async eventsAt(now: Date): Promise<CalendarEvent[]> {
    try {
      const token = await this.accessToken();
      const params = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: new Date(now.getTime() + 1000).toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "20",
        fields: "items(summary,location,status,start,end)",
      });
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.cfg.calendarId)}/events?${params}`;
      const res = await this.f(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`events HTTP ${res.status}`);
      const body = (await res.json()) as {
        items?: {
          summary?: string;
          location?: string;
          status?: string;
          start?: { dateTime?: string; date?: string; timeZone?: string };
          end?: { dateTime?: string; date?: string };
        }[];
      };
      const t = now.getTime();
      return (body.items ?? [])
        .filter(
          (i) =>
            i.status !== "cancelled" && i.start?.dateTime && i.end?.dateTime,
        )
        .map((i) => ({
          summary: i.summary ?? "",
          start: new Date(i.start!.dateTime!),
          end: new Date(i.end!.dateTime!),
          location: i.location,
          timeZone: i.start!.timeZone,
        }))
        .filter((e) => e.start.getTime() <= t && t < e.end.getTime())
        .map(pickFields);
    } catch (cause) {
      throw new CalendarUnavailableError("google calendar unavailable", {
        cause,
      });
    }
  }
}
