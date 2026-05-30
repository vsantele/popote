import { describe, expect, it } from "vite-plus/test";
import { buildIcs, escapeIcsText, formatIcsDate } from "../../src/lib/server/ics";

const CRLF = "\r\n";

describe("escapeIcsText", () => {
  it("escapes backslashes", () => {
    expect(escapeIcsText("a\\b")).toBe("a\\\\b");
  });

  it("escapes semicolons", () => {
    expect(escapeIcsText("a;b")).toBe("a\\;b");
  });

  it("escapes commas", () => {
    expect(escapeIcsText("a,b")).toBe("a\\,b");
  });

  it("escapes LF newlines", () => {
    expect(escapeIcsText("line1\nline2")).toBe("line1\\nline2");
  });

  it("escapes CRLF newlines", () => {
    expect(escapeIcsText("line1\r\nline2")).toBe("line1\\nline2");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeIcsText("Hello World")).toBe("Hello World");
  });
});

describe("formatIcsDate", () => {
  it("formats a UTC date correctly", () => {
    const d = new Date("2026-07-18T19:30:00Z");
    expect(formatIcsDate(d)).toBe("20260718T193000Z");
  });

  it("pads single-digit months and days", () => {
    const d = new Date("2026-01-05T08:05:02Z");
    expect(formatIcsDate(d)).toBe("20260105T080502Z");
  });
});

describe("buildIcs", () => {
  const base = {
    uid: "popote-ABC123@popote.app",
    name: "Soirée test",
    start: new Date("2026-07-18T19:30:00Z"),
    dtstamp: new Date("2026-05-30T12:00:00Z"),
  };

  it("uses CRLF line endings throughout", () => {
    const ics = buildIcs(base);
    // Every line must end with CRLF (no bare LF)
    const lines = ics.split(CRLF);
    // Last entry after split on the final CRLF will be an empty string
    expect(lines[lines.length - 1]).toBe("");
    // No bare LF should remain
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("contains required VCALENDAR wrapper", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("BEGIN:VCALENDAR" + CRLF);
    expect(ics).toContain("END:VCALENDAR" + CRLF);
    expect(ics).toContain("VERSION:2.0" + CRLF);
    expect(ics).toContain("PRODID:-//La Popote//Popote//EN" + CRLF);
  });

  it("contains required VEVENT wrapper", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("BEGIN:VEVENT" + CRLF);
    expect(ics).toContain("END:VEVENT" + CRLF);
  });

  it("contains UID, DTSTAMP, DTSTART, DTEND, SUMMARY", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("UID:popote-ABC123@popote.app" + CRLF);
    expect(ics).toContain("DTSTAMP:20260530T120000Z" + CRLF);
    expect(ics).toContain("DTSTART:20260718T193000Z" + CRLF);
    // default end = start + 2h
    expect(ics).toContain("DTEND:20260718T213000Z" + CRLF);
    expect(ics).toContain("SUMMARY:Soirée test" + CRLF);
  });

  it("omits LOCATION when not provided", () => {
    const ics = buildIcs(base);
    expect(ics).not.toContain("LOCATION:");
  });

  it("includes LOCATION when provided", () => {
    const ics = buildIcs({ ...base, location: "12 rue de la Paix, Paris" });
    expect(ics).toContain("LOCATION:12 rue de la Paix\\, Paris" + CRLF);
  });

  it("omits DESCRIPTION when not provided", () => {
    const ics = buildIcs(base);
    expect(ics).not.toContain("DESCRIPTION:");
  });

  it("includes DESCRIPTION when provided", () => {
    const ics = buildIcs({ ...base, description: "Bring wine; or beer" });
    expect(ics).toContain("DESCRIPTION:Bring wine\\; or beer" + CRLF);
  });

  it("uses custom end time when provided", () => {
    const end = new Date("2026-07-18T23:00:00Z");
    const ics = buildIcs({ ...base, end });
    expect(ics).toContain("DTEND:20260718T230000Z" + CRLF);
  });

  it("escapes special characters in SUMMARY", () => {
    const ics = buildIcs({ ...base, name: "Test, Event; Here" });
    expect(ics).toContain("SUMMARY:Test\\, Event\\; Here" + CRLF);
  });
});
