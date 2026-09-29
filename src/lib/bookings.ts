"use client";

/**
 * Sessions you booked from the booking page.
 *
 * Kept apart from the onboarding profile because onboarding only ever
 * produces one booking, and because bookings are per account — booking
 * something inside the sample account must never touch your own. This is
 * `POST /api/bookings` and `DELETE /api/bookings/:id` once the backend lands.
 */

import type { AccountId } from "./account";
import type { Request, Session } from "./dashboard";
import type { Mentor } from "./onboarding";

export type Booking = {
  id: string;
  mentorId: string;
  mentorName: string;
  year: string;
  branch: string;
  topic: string;
  concept: string;
  day: string;
  time: string;
  length: string;
  /** Taking a slot is a request — the mentor has to accept before the room opens. */
  status: "pending" | "confirmed";
};

const KEY = "mentormatch.bookings.v1";

type Store = Partial<Record<AccountId, Booking[]>>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Private mode or a full quota — the booking just won't survive a reload.
  }
}

export function loadBookings(account: AccountId): Booking[] {
  return read()[account] ?? [];
}

export function addBooking(
  account: AccountId,
  booking: Omit<Booking, "id" | "status">,
): Booking {
  const saved: Booking = { ...booking, id: `bk-${Date.now().toString(36)}`, status: "pending" };
  const store = read();
  write({ ...store, [account]: [...(store[account] ?? []), saved] });
  return saved;
}

/** The mentor said yes — this is what opens the chat room. */
export function acceptBooking(account: AccountId, id: string) {
  const store = read();
  write({
    ...store,
    [account]: (store[account] ?? []).map((b) =>
      b.id === id ? { ...b, status: "confirmed" as const } : b,
    ),
  });
}

export function cancelBooking(account: AccountId, id: string) {
  const store = read();
  write({ ...store, [account]: (store[account] ?? []).filter((b) => b.id !== id) });
}

/** True when that exact slot is spoken for — a pending request holds it too. */
export function isSlotTaken(bookings: Booking[], mentorId: string, day: string, time: string) {
  return bookings.some((b) => b.mentorId === mentorId && b.day === day && b.time === time);
}

export function bookingToSession(booking: Booking): Session {
  return {
    id: booking.id,
    mentorId: booking.mentorId,
    with: booking.mentorName,
    year: booking.year,
    branch: booking.branch,
    topic: booking.topic,
    concept: booking.concept,
    day: booking.day,
    time: booking.time,
    length: booking.length,
    status: booking.status === "confirmed" ? "confirmed" : "pending",
    unread: 0,
  };
}

/** A pending booking is what the mentor sees in their inbox. */
export function bookingToRequest(
  booking: Booking,
  from: string,
  year: string,
  branch: string,
): Request {
  return {
    id: `req-${booking.id}`,
    bookingId: booking.id,
    from,
    year,
    branch,
    topic: booking.topic,
    doubt: booking.concept || "No details — they'll explain in the session.",
    concept: booking.concept,
    asked: "Just now",
    slot: `${booking.day} ${booking.time}`,
    urgent: false,
  };
}

/** The slot list a mentor publishes, with the ones already booked marked. */
export function slotsOf(mentor: Mentor, bookings: Booking[]) {
  return mentor.slots.map((slot) => ({
    ...slot,
    taken: isSlotTaken(bookings, mentor.id, slot.day, slot.time),
  }));
}
