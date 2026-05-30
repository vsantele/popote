import { describe, it, expect, vi } from "vite-plus/test";

// The reminders module imports the live void/db singleton at module load. We
// only exercise its PURE exports here (window/selection/payload), so a thin
// mock that satisfies the import is enough.
vi.mock("void/db", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return { db: {}, eq: actual.eq, and: actual.and, gte: actual.gte, lte: actual.lte, isNull: actual.isNull, or: actual.or };
});
vi.mock("@schema", () => ({
  events: {},
  participants: {},
  pushSubscriptions: {},
  sentReminders: {},
}));

import {
  reminderWindow,
  isEventDue,
  buildReminderPayload,
} from "../../src/lib/server/push/reminders";

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 4, 30, 12, 0, 0); // fixed instant

describe("reminderWindow", () => {
  it("centres ~24h ahead with a ±1h tolerance by default", () => {
    const { fromMs, toMs } = reminderWindow(NOW);
    expect(fromMs).toBe(NOW + 23 * HOUR);
    expect(toMs).toBe(NOW + 25 * HOUR);
  });
});

describe("isEventDue (T-24h selection)", () => {
  it("is due for an event exactly 24h away", () => {
    expect(isEventDue(NOW + 24 * HOUR, NOW)).toBe(true);
  });

  it("is due within the ±1h window edges", () => {
    expect(isEventDue(NOW + 23 * HOUR, NOW)).toBe(true);
    expect(isEventDue(NOW + 25 * HOUR, NOW)).toBe(true);
  });

  it("is NOT due for an event only 12h away (too soon)", () => {
    expect(isEventDue(NOW + 12 * HOUR, NOW)).toBe(false);
  });

  it("is NOT due for an event 48h away (too far)", () => {
    expect(isEventDue(NOW + 48 * HOUR, NOW)).toBe(false);
  });

  it("is NOT due for a past event", () => {
    expect(isEventDue(NOW - HOUR, NOW)).toBe(false);
  });

  it("honours a custom aheadHours", () => {
    expect(isEventDue(NOW + 2 * HOUR, NOW, { aheadHours: 2 })).toBe(true);
    expect(isEventDue(NOW + 24 * HOUR, NOW, { aheadHours: 2 })).toBe(false);
  });
});

describe("buildReminderPayload", () => {
  it("encodes title/body/url/tag as JSON for the service worker", () => {
    const json = buildReminderPayload({
      name: "BBQ chez Nico",
      shareCode: "ABC123",
      dateMs: NOW,
    });
    const parsed = JSON.parse(json);
    expect(parsed.title).toContain("Popote");
    expect(parsed.body).toContain("BBQ chez Nico");
    expect(parsed.url).toBe("/e/ABC123");
    expect(parsed.tag).toBe("event-reminder-ABC123");
  });
});
