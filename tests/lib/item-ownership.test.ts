import { describe, expect, it, vi, beforeEach } from "vite-plus/test";

// The db helpers import the live `void/db` singleton, which is undefined
// outside the Vite virtual module. We mock it with a chainable fake so we can
// assert exactly which rows the WHERE clause targets and whether a mutation is
// performed at all. This is the security-critical surface: a non-owner /
// non-host must NEVER reach the underlying UPDATE/DELETE.
const { selectMock, updateMock, deleteMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("void/db", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    db: {
      select: selectMock,
      update: updateMock,
      delete: deleteMock,
    },
    eq: actual.eq,
    and: actual.and,
    desc: vi.fn(),
    sql: vi.fn(),
  };
});

vi.mock("@schema", () => ({
  events: {},
  participants: {},
  items: {},
}));

import { updateItem, deleteItem } from "../../src/lib/server/db/index";

/** A chainable query-builder stub whose terminal call resolves to `rows`. */
function makeSelect(rows: unknown[]) {
  const chain = {
    from: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
  };
  return chain;
}

/** A chainable update/delete stub. Records whether `.where()` ran. */
function makeMutation(record: { ran: boolean }) {
  const chain = {
    set: () => chain,
    where: () => {
      record.ran = true;
      return {
        returning: () => Promise.resolve([{ id: 1 }]),
      };
    },
  };
  return chain;
}

const OWNER = "user-owner";
const HOST = "user-host";
const STRANGER = "user-stranger";

// An item belonging to participant 10 (owned by OWNER) in event 1 (hosted by
// HOST). The select for ownership returns this joined row.
function seedItemRow() {
  selectMock.mockReturnValue(
    makeSelect([
      {
        item: { id: 5, eventId: 1, participantId: 10 },
        participant: { id: 10, userId: OWNER },
        event: { id: 1, hostUserId: HOST },
      },
    ]),
  );
}

beforeEach(() => {
  selectMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe("deleteItem ownership enforcement", () => {
  it("lets the item's owner delete their own item", async () => {
    seedItemRow();
    const mutation = { ran: false };
    deleteMock.mockReturnValue(makeMutation(mutation));

    const result = await deleteItem({ itemId: 5, userId: OWNER });

    expect(result.ok).toBe(true);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(mutation.ran).toBe(true);
  });

  it("lets the host delete ANY item", async () => {
    seedItemRow();
    const mutation = { ran: false };
    deleteMock.mockReturnValue(makeMutation(mutation));

    const result = await deleteItem({ itemId: 5, userId: HOST });

    expect(result.ok).toBe(true);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(mutation.ran).toBe(true);
  });

  it("REFUSES to delete an item the user neither owns nor hosts", async () => {
    seedItemRow();
    deleteMock.mockReturnValue(makeMutation({ ran: false }));

    const result = await deleteItem({ itemId: 5, userId: STRANGER });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forbidden");
    // The mutation builder must never be invoked for an unauthorized user.
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("returns not_found when the item does not exist", async () => {
    selectMock.mockReturnValue(makeSelect([]));
    deleteMock.mockReturnValue(makeMutation({ ran: false }));

    const result = await deleteItem({ itemId: 999, userId: OWNER });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("updateItem ownership enforcement", () => {
  const patch = { name: "Updated", category: "dessert", quantity: "x2" };

  it("lets the item's owner update their own item", async () => {
    seedItemRow();
    const mutation = { ran: false };
    updateMock.mockReturnValue(makeMutation(mutation));

    const result = await updateItem({ itemId: 5, userId: OWNER, data: patch });

    expect(result.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(mutation.ran).toBe(true);
  });

  it("lets the host update ANY item", async () => {
    seedItemRow();
    const mutation = { ran: false };
    updateMock.mockReturnValue(makeMutation(mutation));

    const result = await updateItem({ itemId: 5, userId: HOST, data: patch });

    expect(result.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("REFUSES to update an item the user neither owns nor hosts", async () => {
    seedItemRow();
    updateMock.mockReturnValue(makeMutation({ ran: false }));

    const result = await updateItem({
      itemId: 5,
      userId: STRANGER,
      data: patch,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forbidden");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns not_found when the item does not exist", async () => {
    selectMock.mockReturnValue(makeSelect([]));
    updateMock.mockReturnValue(makeMutation({ ran: false }));

    const result = await updateItem({
      itemId: 999,
      userId: OWNER,
      data: patch,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
    expect(updateMock).not.toHaveBeenCalled();
  });
});
