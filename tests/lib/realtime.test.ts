import { describe, expect, it, vi, beforeEach } from "vite-plus/test";

// `eventVersion` reads the live `void/db` singleton (undefined outside the Vite
// virtual module), so we mock it with a chainable fake. The probe issues, in
// order: select(event) -> select(participants agg) -> select(items agg). We
// queue the resolved rows for each call so we can assert the resulting token.
const { selectMock } = vi.hoisted(() => ({ selectMock: vi.fn() }));

vi.mock("void/db", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    db: { select: selectMock },
    eq: actual.eq,
    sql: actual.sql,
  };
});

vi.mock("@schema", () => ({
  events: { id: {}, updatedAt: {}, shareCode: {} },
  participants: { eventId: {}, createdAt: {}, updatedAt: {} },
  items: { eventId: {}, createdAt: {}, updatedAt: {} },
}));

vi.mock("$lib/server/db/schema", () => ({
  events: { id: {}, updatedAt: {}, shareCode: {} },
  participants: { eventId: {}, createdAt: {}, updatedAt: {} },
  items: { eventId: {}, createdAt: {}, updatedAt: {} },
}));

import { eventVersion } from "../../src/lib/server/realtime";

/** Chainable select stub whose terminal call resolves to `rows`. */
function makeSelect(rows: unknown[]) {
  const chain = {
    from: () => chain,
    where: () => ({
      limit: () => Promise.resolve(rows),
      then: (resolve: (v: unknown[]) => unknown) => resolve(rows),
    }),
  };
  return chain;
}

type Agg = { count: number; maxCreated: number; maxUpdated: number };

function seed(opts: {
  event?: { id: number; updatedAt: Date } | null;
  participants: Agg;
  items: Agg;
}) {
  const event =
    opts.event === undefined ? { id: 1, updatedAt: new Date(0) } : opts.event;
  selectMock
    .mockReturnValueOnce(makeSelect(event ? [event] : []))
    .mockReturnValueOnce(makeSelect([opts.participants]))
    .mockReturnValueOnce(makeSelect([opts.items]));
}

beforeEach(() => {
  selectMock.mockReset();
});

describe("eventVersion change probe", () => {
  it("returns a stable token for identical board state", async () => {
    seed({
      participants: { count: 2, maxCreated: 100, maxUpdated: 100 },
      items: { count: 3, maxCreated: 200, maxUpdated: 250 },
    });
    const a = await eventVersion("abc");

    seed({
      participants: { count: 2, maxCreated: 100, maxUpdated: 100 },
      items: { count: 3, maxCreated: 200, maxUpdated: 250 },
    });
    const b = await eventVersion("abc");

    expect(a.token).toBe(b.token);
    expect(a.eventId).toBe(1);
  });

  it("changes the token when an item is added (count up)", async () => {
    seed({
      participants: { count: 2, maxCreated: 100, maxUpdated: 100 },
      items: { count: 3, maxCreated: 200, maxUpdated: 250 },
    });
    const before = await eventVersion("abc");

    seed({
      participants: { count: 2, maxCreated: 100, maxUpdated: 100 },
      items: { count: 4, maxCreated: 300, maxUpdated: 300 },
    });
    const after = await eventVersion("abc");

    expect(after.token).not.toBe(before.token);
  });

  it("changes the token when an item is edited (maxUpdated up, count same)", async () => {
    seed({
      participants: { count: 2, maxCreated: 100, maxUpdated: 100 },
      items: { count: 3, maxCreated: 200, maxUpdated: 250 },
    });
    const before = await eventVersion("abc");

    seed({
      participants: { count: 2, maxCreated: 100, maxUpdated: 100 },
      items: { count: 3, maxCreated: 200, maxUpdated: 999 },
    });
    const after = await eventVersion("abc");

    expect(after.token).not.toBe(before.token);
  });

  it("changes the token when an item is removed (count down)", async () => {
    seed({
      participants: { count: 2, maxCreated: 100, maxUpdated: 100 },
      items: { count: 3, maxCreated: 200, maxUpdated: 250 },
    });
    const before = await eventVersion("abc");

    // A delete lowers the count even though the surviving rows' max timestamps
    // may be unchanged — the count component catches it.
    seed({
      participants: { count: 2, maxCreated: 100, maxUpdated: 100 },
      items: { count: 2, maxCreated: 200, maxUpdated: 250 },
    });
    const after = await eventVersion("abc");

    expect(after.token).not.toBe(before.token);
  });

  it("changes the token when a participant joins", async () => {
    seed({
      participants: { count: 2, maxCreated: 100, maxUpdated: 100 },
      items: { count: 3, maxCreated: 200, maxUpdated: 250 },
    });
    const before = await eventVersion("abc");

    seed({
      participants: { count: 3, maxCreated: 500, maxUpdated: 500 },
      items: { count: 3, maxCreated: 200, maxUpdated: 250 },
    });
    const after = await eventVersion("abc");

    expect(after.token).not.toBe(before.token);
  });

  it("reports eventId null for a missing event", async () => {
    seed({
      event: null,
      participants: { count: 0, maxCreated: 0, maxUpdated: 0 },
      items: { count: 0, maxCreated: 0, maxUpdated: 0 },
    });

    const v = await eventVersion("nope");
    expect(v.eventId).toBeNull();
    expect(v.token).toBe("missing");
  });
});
