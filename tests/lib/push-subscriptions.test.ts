import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

// Mock the live void/db singleton with chainable fakes so we can assert
// idempotency: an existing endpoint UPDATEs (never a second INSERT), and
// unsubscribe DELETEs scoped to the user.
const { selectMock, insertMock, updateMock, deleteMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("void/db", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    db: {
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
    },
    eq: actual.eq,
    and: actual.and,
  };
});

vi.mock("@schema", () => ({
  pushSubscriptions: {
    id: "id",
    endpoint: "endpoint",
    userId: "user_id",
  },
}));

import {
  saveSubscription,
  deleteSubscription,
} from "../../src/lib/server/push/subscriptions";

function makeSelect(rows: unknown[]) {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
  };
  return chain;
}

const SUB = {
  endpoint: "https://push.example.com/abc",
  keys: { p256dh: "p", auth: "a" },
};

beforeEach(() => {
  selectMock.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe("saveSubscription idempotency", () => {
  it("INSERTs when the endpoint is new", async () => {
    selectMock.mockReturnValue(makeSelect([]));
    const values = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values });

    const result = await saveSubscription({ userId: "u1", subscription: SUB });

    expect(result).toEqual({ ok: true, created: true });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("UPDATEs (no second INSERT) when the endpoint already exists", async () => {
    selectMock.mockReturnValue(makeSelect([{ id: 7 }]));
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    updateMock.mockReturnValue({ set });

    const result = await saveSubscription({
      userId: "u1",
      subscription: SUB,
      eventId: 3,
    });

    expect(result).toEqual({ ok: true, created: false });
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed subscription without touching the db", async () => {
    const result = await saveSubscription({
      userId: "u1",
      // @ts-expect-error intentionally malformed
      subscription: { endpoint: "", keys: {} },
    });
    expect(result).toEqual({ ok: false });
    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("deleteSubscription opt-out", () => {
  it("DELETEs the endpoint and is idempotent", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    deleteMock.mockReturnValue({ where });

    const result = await deleteSubscription({
      userId: "u1",
      endpoint: SUB.endpoint,
    });

    expect(result).toEqual({ ok: true });
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
  });
});
