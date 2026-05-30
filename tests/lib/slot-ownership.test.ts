import { describe, expect, it, vi, beforeEach } from "vite-plus/test";

// As in item-ownership.test.ts, the db helpers import the live `void/db`
// singleton, which is undefined outside the Vite virtual module. We mock it
// with a chainable fake so we can assert exactly which rows a WHERE targets and
// whether a mutation is performed at all. This is the security-critical
// surface: a NON-host must NEVER reach the slot INSERT/UPDATE/DELETE, and a
// claim must NEVER push a slot beyond its needed count.
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
    desc: vi.fn(),
    sql: actual.sql,
  };
});

vi.mock("@schema", () => ({
  events: {},
  participants: {},
  items: {},
  eventSlots: {},
}));

import {
  createSlot,
  updateSlot,
  deleteSlot,
  claimSlot,
} from "../../src/lib/server/db/index";

/** A chainable SELECT stub whose terminal call resolves to `rows`. */
function makeSelect(rows: unknown[]) {
  const chain = {
    from: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    groupBy: () => chain,
    orderBy: () => Promise.resolve(rows),
    limit: () => Promise.resolve(rows),
    // Allow a bare `await db.select()...where()` (no limit) to resolve too.
    then: (resolve: (v: unknown[]) => unknown) => resolve(rows),
  };
  return chain;
}

/** A chainable INSERT stub. Records whether `.values()` ran. */
function makeInsert(record: { ran: boolean }) {
  const chain = {
    values: () => {
      record.ran = true;
      return {
        returning: () => Promise.resolve([{ id: 42 }]),
        then: (resolve: (v: unknown) => unknown) => resolve(undefined),
      };
    },
  };
  return chain;
}

/** A chainable UPDATE/DELETE stub. Records whether `.where()` ran. */
function makeMutation(record: { ran: boolean }) {
  const chain = {
    set: () => chain,
    where: () => {
      record.ran = true;
      return Promise.resolve([{ id: 1 }]);
    },
  };
  return chain;
}

const HOST = "user-host";
const STRANGER = "user-stranger";

beforeEach(() => {
  selectMock.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe("createSlot host-only enforcement", () => {
  it("lets the host create a slot", async () => {
    // createSlot first SELECTs the event to read hostUserId.
    selectMock.mockReturnValueOnce(
      makeSelect([{ id: 1, hostUserId: HOST }]),
    );
    const ins = { ran: false };
    insertMock.mockReturnValue(makeInsert(ins));

    const result = await createSlot({
      eventId: 1,
      userId: HOST,
      data: { label: "Dessert", category: "dessert", neededCount: 2 },
    });

    expect(result.ok).toBe(true);
    expect(ins.ran).toBe(true);
  });

  it("REFUSES a non-host before any write", async () => {
    selectMock.mockReturnValueOnce(
      makeSelect([{ id: 1, hostUserId: HOST }]),
    );
    insertMock.mockReturnValue(makeInsert({ ran: false }));

    const result = await createSlot({
      eventId: 1,
      userId: STRANGER,
      data: { label: "Dessert", category: null, neededCount: 1 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forbidden");
    // The INSERT builder must never be touched for a non-host.
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects a blank label as invalid", async () => {
    selectMock.mockReturnValueOnce(
      makeSelect([{ id: 1, hostUserId: HOST }]),
    );
    insertMock.mockReturnValue(makeInsert({ ran: false }));

    const result = await createSlot({
      eventId: 1,
      userId: HOST,
      data: { label: "   ", category: null, neededCount: 1 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("updateSlot / deleteSlot host-only enforcement", () => {
  // authorizeSlotMutation SELECTs the slot joined to its event.
  function seedSlotRow() {
    selectMock.mockReturnValueOnce(
      makeSelect([
        {
          slot: { id: 9, eventId: 1 },
          event: { id: 1, hostUserId: HOST },
        },
      ]),
    );
  }

  it("lets the host edit a slot", async () => {
    seedSlotRow();
    const mut = { ran: false };
    updateMock.mockReturnValue(makeMutation(mut));

    const result = await updateSlot({
      slotId: 9,
      userId: HOST,
      data: { label: "Plat", category: "plat", neededCount: 3 },
    });

    expect(result.ok).toBe(true);
    expect(mut.ran).toBe(true);
  });

  it("REFUSES a non-host edit before any write", async () => {
    seedSlotRow();
    updateMock.mockReturnValue(makeMutation({ ran: false }));

    const result = await updateSlot({
      slotId: 9,
      userId: STRANGER,
      data: { label: "Plat", category: "plat", neededCount: 3 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forbidden");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("REFUSES a non-host delete before any write", async () => {
    seedSlotRow();
    deleteMock.mockReturnValue(makeMutation({ ran: false }));

    const result = await deleteSlot({ slotId: 9, userId: STRANGER });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forbidden");
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("returns not_found for a missing slot", async () => {
    selectMock.mockReturnValueOnce(makeSelect([]));
    deleteMock.mockReturnValue(makeMutation({ ran: false }));

    const result = await deleteSlot({ slotId: 999, userId: HOST });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("claimSlot — creates an item and prevents over-claiming", () => {
  it("claims an open slot: creates an item linked to the slot", async () => {
    // 1) SELECT the slot, 2) SELECT count(items) for the slot.
    selectMock
      .mockReturnValueOnce(
        makeSelect([{ id: 9, eventId: 1, label: "Glaçons", category: null, neededCount: 2 }]),
      )
      .mockReturnValueOnce(makeSelect([{ claimed: 0 }]));
    const ins = { ran: false };
    insertMock.mockReturnValue(makeInsert(ins));

    const result = await claimSlot({ slotId: 9, participantId: 7 });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.itemId).toBe(42);
    // Claiming converts the slot into an item (the INSERT ran).
    expect(ins.ran).toBe(true);
  });

  it("PREVENTS over-claiming: a full slot is refused before any insert", async () => {
    selectMock
      .mockReturnValueOnce(
        makeSelect([{ id: 9, eventId: 1, label: "Dessert", category: "dessert", neededCount: 2 }]),
      )
      // Already 2 claims against a needed count of 2 → full.
      .mockReturnValueOnce(makeSelect([{ claimed: 2 }]));
    insertMock.mockReturnValue(makeInsert({ ran: false }));

    const result = await claimSlot({ slotId: 9, participantId: 7 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("full");
    // No item is created when the slot is already full.
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns not_found for a missing slot", async () => {
    selectMock.mockReturnValueOnce(makeSelect([]));
    insertMock.mockReturnValue(makeInsert({ ran: false }));

    const result = await claimSlot({ slotId: 999, participantId: 7 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
    expect(insertMock).not.toHaveBeenCalled();
  });
});
