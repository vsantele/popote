/**
 * Minimal RFC 5545 (iCalendar) generator.
 *
 * Hand-rolled — no heavy dependency needed. Produces a valid VCALENDAR/VEVENT
 * text with proper CRLF line endings and RFC 5545 text-field escaping.
 */

/** Escape text values per RFC 5545 §3.3.11 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\") // backslash first
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Format a Date as a UTC datetime string: YYYYMMDDTHHmmssZ */
export function formatIcsDate(date: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

export interface IcsEvent {
  uid: string;
  /** Event title */
  name: string;
  /** Start time */
  start: Date;
  /** Optional end time; defaults to start + 2 hours */
  end?: Date;
  location?: string;
  description?: string;
  /** Timestamp of calendar object creation/export */
  dtstamp?: Date;
}

/**
 * Build a complete VCALENDAR string with a single VEVENT.
 *
 * Lines are terminated with CRLF as required by RFC 5545 §3.5.
 */
export function buildIcs(event: IcsEvent): string {
  const CRLF = "\r\n";
  const dtstamp = formatIcsDate(event.dtstamp ?? new Date());
  const dtstart = formatIcsDate(event.start);
  const dtend = formatIcsDate(
    event.end ?? new Date(event.start.getTime() + 2 * 60 * 60 * 1000),
  );

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Popote//Popote//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcsText(event.name)}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join(CRLF) + CRLF;
}
