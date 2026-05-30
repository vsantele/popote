import type { RsvpStatus } from "@schema";

/**
 * Minimal shape needed to compute a headcount. Works with both DB rows and the
 * page-transformed participant objects.
 */
export interface HeadcountParticipant {
  rsvp: RsvpStatus;
  extraGuests: number;
}

export interface Headcount {
  /**
   * Confirmed headcount: for every participant who is "going", count them
   * (1) plus their +1s (extraGuests). This is the number that powers
   * quantities — "enough for N at the table".
   */
  confirmed: number;
  /** People (heads, incl. their +1s) who answered "maybe". */
  maybe: number;
  /** Number of participants who declined ("not"). */
  declined: number;
  /** Number of participant rows that are "going" (people, excl. +1s). */
  goingParticipants: number;
}

/**
 * Compute the headcount from a set of participants.
 *
 * Definition (documented in the PR): the confirmed headcount is the sum over
 * participants with RSVP = "going" of `(1 + extraGuests)`. "maybe" is summed
 * the same way but kept separate; "not" simply counts declined people.
 */
export function computeHeadcount(
  participants: readonly HeadcountParticipant[],
): Headcount {
  let confirmed = 0;
  let maybe = 0;
  let declined = 0;
  let goingParticipants = 0;

  for (const p of participants) {
    const extra = Number.isFinite(p.extraGuests)
      ? Math.max(0, Math.trunc(p.extraGuests))
      : 0;
    const heads = 1 + extra;
    if (p.rsvp === "going") {
      confirmed += heads;
      goingParticipants += 1;
    } else if (p.rsvp === "maybe") {
      maybe += heads;
    } else {
      declined += 1;
    }
  }

  return { confirmed, maybe, declined, goingParticipants };
}
