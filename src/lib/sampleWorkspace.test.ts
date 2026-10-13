// @vitest-environment jsdom
/**
 * The sample workspace is one account wearing both hats, and the whole point of
 * it is that you can take a slot from Meera as the junior and then answer it as
 * Meera. It was broken in two places at once: each of the old `demo-student` /
 * `demo-mentor` ids gated the other's dashboard, and each had its own booking
 * store, so the request landed in a bucket the inbox never read.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  currentAccount,
  DEMO_ACCOUNT,
  DEMO_MENTOR_ID,
  isDemo,
  mentorView,
  signIn,
  studentView,
} from "./account";
import { acceptBooking, addBooking, loadBookings } from "./bookings";
import { addDoubt, loadDoubts } from "./doubts";

function createStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => items.delete(key),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

const meeraSlot = {
  mentorId: DEMO_MENTOR_ID,
  mentorName: "Meera J.",
  year: "4th Year",
  branch: "Civil",
  topic: "Structural Analysis",
  concept: "Load paths & support conditions",
  day: "Mon",
  time: "11 AM",
  length: "45 min",
};

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { configurable: true, value: createStorage() });
});

afterEach(() => {
  window.localStorage.clear();
});

describe("both hats of the sample workspace are reachable", () => {
  it("renders the junior and the mentor dashboard from the same account", () => {
    expect(studentView(DEMO_ACCOUNT, null)).not.toBeNull();
    expect(mentorView(DEMO_ACCOUNT, null)).not.toBeNull();
  });

  it("treats the legacy split ids as the same workspace", () => {
    expect(isDemo("demo-student")).toBe(true);
    expect(isDemo("demo-mentor")).toBe(true);
    expect(isDemo("me")).toBe(false);
    expect(isDemo(null)).toBe(false);
    // The gate that made one hat unreachable from the other.
    expect(mentorView("demo-student", null)).not.toBeNull();
    expect(studentView("demo-mentor", null)).not.toBeNull();
  });
});

describe("a slot taken from Meera reaches Meera's inbox", () => {
  it("shows up as a pending request, and accepting it confirms the session", () => {
    const booking = addBooking(DEMO_ACCOUNT, meeraSlot);
    const bookings = loadBookings(DEMO_ACCOUNT);

    // The junior sees it waiting.
    const student = studentView(DEMO_ACCOUNT, null, bookings)!;
    expect(student.sessions.find((s) => s.id === booking.id)?.status).toBe("pending");

    // The mentor sees it as a request carrying the booking it came from.
    const mentor = mentorView(DEMO_ACCOUNT, null, bookings)!;
    const request = mentor.requests.find((r) => r.bookingId === booking.id);
    expect(request).toBeDefined();
    expect(request!.topic).toBe("Structural Analysis");
    expect(request!.slot).toBe("Mon 11 AM");

    // Accepting is what opens the room, on both sides.
    acceptBooking(DEMO_ACCOUNT, booking.id);
    const after = loadBookings(DEMO_ACCOUNT);
    expect(studentView(DEMO_ACCOUNT, null, after)!.sessions.find((s) => s.id === booking.id)?.status).toBe("confirmed");
    expect(mentorView(DEMO_ACCOUNT, null, after)!.requests.some((r) => r.bookingId === booking.id)).toBe(false);
    expect(mentorView(DEMO_ACCOUNT, null, after)!.sessions.some((s) => s.id === booking.id)).toBe(true);
  });

  it("dates the request from when it was asked rather than always 'Just now'", () => {
    const booking = addBooking(DEMO_ACCOUNT, meeraSlot);
    expect(booking.at).toBeTypeOf("number");

    const stale = [{ ...booking, at: Date.now() - 3 * 60 * 60 * 1000 }];
    expect(mentorView(DEMO_ACCOUNT, null, stale)!.requests[0].asked).toBe("3 hours ago");
  });

  it("falls back for bookings saved before the timestamp existed", () => {
    const { at: _at, ...legacy } = addBooking(DEMO_ACCOUNT, meeraSlot);
    expect(mentorView(DEMO_ACCOUNT, null, [legacy])!.requests[0].asked).toBe("Recently");
  });
});

describe("migrating off the split sample accounts", () => {
  it("moves a request made under a legacy id into the shared workspace", () => {
    const booking = addBooking("demo-student", meeraSlot);
    const doubt = addDoubt("demo-student", { topic: "AutoCAD", text: "Plot scale is wrong", concept: "" });
    window.localStorage.setItem("mentormatch.account.v1", "demo-student");

    // Reading the account is what triggers the one-off migration.
    expect(currentAccount()).toBe(DEMO_ACCOUNT);
    expect(window.localStorage.getItem("mentormatch.account.v1")).toBe(DEMO_ACCOUNT);

    expect(loadBookings("demo-student")).toEqual([]);
    expect(loadBookings(DEMO_ACCOUNT).map((b) => b.id)).toEqual([booking.id]);
    expect(loadDoubts(DEMO_ACCOUNT).map((d) => d.id)).toEqual([doubt.id]);

    // And it now arrives where it always should have.
    const mentor = mentorView(DEMO_ACCOUNT, null, loadBookings(DEMO_ACCOUNT))!;
    expect(mentor.requests.some((r) => r.bookingId === booking.id)).toBe(true);
  });

  it("merges both legacy buckets without losing or duplicating anything", () => {
    const asJunior = addBooking("demo-student", meeraSlot);
    const asMentor = addBooking("demo-mentor", { ...meeraSlot, day: "Wed", time: "5 PM" });

    signIn("demo-student");
    expect(currentAccount()).toBe(DEMO_ACCOUNT);
    signIn("demo-mentor");
    expect(currentAccount()).toBe(DEMO_ACCOUNT);

    const ids = loadBookings(DEMO_ACCOUNT).map((b) => b.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids)).toEqual(new Set([asJunior.id, asMentor.id]));
  });

  it("never writes a legacy id back", () => {
    signIn("demo-mentor");
    expect(window.localStorage.getItem("mentormatch.account.v1")).toBe(DEMO_ACCOUNT);
    signIn("me");
    expect(window.localStorage.getItem("mentormatch.account.v1")).toBe("me");
  });
});
