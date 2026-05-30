import { describe, expect, it, vi, beforeEach } from "vite-plus/test";

// As in item-ownership.test.ts, the db helpers import the live `void/db`
// singleton, which is undefined outside the Vite virtual module. We mock it
// with a chainable fake so we can assert which participant the WHERE clause
// targets and whether the UPDATE is ever performed. This is the
// security-critical surface: a user must NEVER be able to change another
// participant's RSVP.
const { selectMock, updateMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("void/db", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    db: {
      select: selectMock,
      update: updateMock,
      delete: vi.fn(),
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

import { updateRsvp } from "../../src/lib/server/db/index";

/** A chainable query-builder stub whose terminal `.limit()` resolves to rows. */
function makeSelect(rows: unknown[]) {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
  };
  return chain;
}

/** A chainable update stub. Records whether `.where()` ran + the patch. */
function makeUpdate(record: { ran: boolean; set?: unknown }) {
  const chain = {
    set: (patch: unknown) => {
      record.set = patch;
      return chain;
    },
    where: () => {
      record.ran = true;
      return Promise.resolve([{ id: 1 }]);
    },
  };
  return chain;
}

const OWNER = "user-owner";
const STRANGER = "user-stranger";

/** Participant row #7, owned by OWNER. */
function seedParticipantRow() {
  selectMock.mockReturnValue(
    makeSelect([{ id: 7, userId: OWNER }]),
  );
}

beforeEach(() => {
  selectMock.mockReset();
  updateMock.mockReset();
});

const patch = { rsvp: "going" as const, extraGuests: 2 };

describe("updateRsvp ownership enforcement", () => {
  it("lets a participant update their OWN RSVP", async () => {
    seedParticipantRow();
    const mutation = { ran: false };
    updateMock.mockReturnValue(makeUpdate(mutation));

    const result = await updateRsvp({
      participantId: 7,
      userId: OWNER,
      data: patch,
    });

    expect(result.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(mutation.ran).toBe(true);
  });

  it("REFUSES to change a participant the user does not own", async () => {
    seedParticipantRow();
    updateMock.mockReturnValue(makeUpdate({ ran: false }));

    const result = await updateRsvp({
      participantId: 7,
      userId: STRANGER,
      data: patch,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forbidden");
    // The UPDATE builder must never be invoked for a non-owner — the write is
    // rejected before it can touch the database.
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns not_found when the participant does not exist", async () => {
    selectMock.mockReturnValue(makeSelect([]));
    updateMock.mockReturnValue(makeUpdate({ ran: false }));

    const result = await updateRsvp({
      participantId: 999,
      userId: OWNER,
      data: patch,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("clamps a negative extraGuests to 0 before writing", async () => {
    seedParticipantRow();
    const mutation = { ran: false } as { ran: boolean; set?: { extraGuests?: number } };
    updateMock.mockReturnValue(makeUpdate(mutation));

    const result = await updateRsvp({
      participantId: 7,
      userId: OWNER,
      data: { rsvp: "going", extraGuests: -5 },
    });

    expect(result.ok).toBe(true);
    expect(mutation.set?.extraGuests).toBe(0);
  });

  it("bumps updatedAt so the realtime probe sees the change", async () => {
    seedParticipantRow();
    const mutation = { ran: false } as {
      ran: boolean;
      set?: { updatedAt?: unknown };
    };
    updateMock.mockReturnValue(makeUpdate(mutation));

    await updateRsvp({ participantId: 7, userId: OWNER, data: patch });

    expect(mutation.set?.updatedAt).toBeInstanceOf(Date);
  });
});
