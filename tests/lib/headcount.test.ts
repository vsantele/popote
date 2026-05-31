import { describe, expect, it } from "vite-plus/test";
import {
  computeHeadcount,
  type HeadcountParticipant,
} from "../../src/lib/utils/headcount";

describe("computeHeadcount", () => {
  it("sums (1 + extraGuests) over GOING participants only", () => {
    const participants: HeadcountParticipant[] = [
      { rsvp: "going", extraGuests: 0 }, // 1
      { rsvp: "going", extraGuests: 2 }, // 3
      { rsvp: "maybe", extraGuests: 1 }, // not confirmed
      { rsvp: "not", extraGuests: 5 }, // declined, ignored
    ];

    const hc = computeHeadcount(participants);

    expect(hc.confirmed).toBe(4); // 1 + 3
    expect(hc.goingParticipants).toBe(2);
    expect(hc.maybe).toBe(2); // 1 + 1
    expect(hc.declined).toBe(1);
  });

  it("returns all-zero for an empty event", () => {
    const hc = computeHeadcount([]);
    expect(hc).toEqual({
      confirmed: 0,
      maybe: 0,
      declined: 0,
      goingParticipants: 0,
    });
  });

  it("counts a lone going host with no +1s as 1 confirmed", () => {
    const hc = computeHeadcount([{ rsvp: "going", extraGuests: 0 }]);
    expect(hc.confirmed).toBe(1);
  });

  it("clamps negative or non-integer extraGuests to a sane head count", () => {
    const hc = computeHeadcount([
      { rsvp: "going", extraGuests: -3 }, // clamped to 0 -> 1 head
      { rsvp: "going", extraGuests: 2.9 }, // truncated to 2 -> 3 heads
    ]);
    expect(hc.confirmed).toBe(4);
  });

  it("keeps maybe and not fully separate from the confirmed total", () => {
    const hc = computeHeadcount([
      { rsvp: "maybe", extraGuests: 3 },
      { rsvp: "not", extraGuests: 1 },
    ]);
    expect(hc.confirmed).toBe(0);
    expect(hc.maybe).toBe(4); // 1 + 3
    expect(hc.declined).toBe(1);
    expect(hc.goingParticipants).toBe(0);
  });

  it("host with extraGuests=N contributes 1+N to confirmed (Bug #33)", () => {
    // The host is always "going"; adding N extra guests should count as 1+N
    // confirmed heads, not just 1. This is the regression guard for issue #33.
    const hc = computeHeadcount([{ rsvp: "going", extraGuests: 2 }]);
    expect(hc.confirmed).toBe(3); // 1 (host) + 2 (extra guests)
    expect(hc.goingParticipants).toBe(1);
  });

  it("host +1s are added to the total even with other going participants", () => {
    // Host with +2, plus one regular guest also going (no +1s) = 3 + 1 = 4
    const hc = computeHeadcount([
      { rsvp: "going", extraGuests: 2 }, // host
      { rsvp: "going", extraGuests: 0 }, // guest
    ]);
    expect(hc.confirmed).toBe(4);
  });
});
