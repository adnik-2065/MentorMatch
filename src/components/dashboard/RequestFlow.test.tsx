// @vitest-environment jsdom
/**
 * The flow a demo walks through: take one of Meera's slots as the junior, find
 * it in Meera's inbox, accept it, land in the room. It used to dead-end at step
 * two — the mentoring dashboard was gated behind a different account id, and the
 * booking was in a store that id never read.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudentDashboard } from "./StudentDashboard";
import { MentorDashboard } from "./MentorDashboard";
import { DEMO_ACCOUNT, DEMO_MENTOR_ID, signIn } from "@/lib/account";
import { addBooking, loadBookings } from "@/lib/bookings";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/mentor",
  useSearchParams: () => new URLSearchParams(),
}));

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
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
  signIn(DEMO_ACCOUNT);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("requesting a slot from the sample mentor", () => {
  it("shows the junior where to accept it, instead of a dead end", () => {
    addBooking(DEMO_ACCOUNT, meeraSlot);
    render(<StudentDashboard />);

    expect(screen.getByText("Awaiting confirmation")).toBeTruthy();
    expect(screen.getByText(/you're Meera J\. on the mentoring side/i)).toBeTruthy();

    const link = screen.getByRole("link", { name: /Accept it as Meera/i });
    expect(link.getAttribute("href")).toBe("/mentor");
  });

  it("puts it in Meera's inbox with the junior's context", () => {
    addBooking(DEMO_ACCOUNT, meeraSlot);
    render(<MentorDashboard />);

    // The seeded sample requests plus the one just made.
    expect(screen.getByText(/awaiting response/).textContent).toMatch(/^4 /);
    expect(screen.getAllByText("Structural Analysis").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mon 11 AM/).length).toBe(1);
  });

  it("confirms the session when Meera accepts, and opens the room", () => {
    const booking = addBooking(DEMO_ACCOUNT, meeraSlot);
    render(<MentorDashboard />);

    const slotRow = screen.getByText(/Mon 11 AM/).closest("li")!;
    fireEvent.click(slotRow.querySelector("button")!);

    // Written through to the store, not just local component state.
    expect(loadBookings(DEMO_ACCOUNT).find((b) => b.id === booking.id)?.status).toBe("confirmed");

    // The card leaves the inbox, so the decision has to be acknowledged somewhere.
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/Aditya N\.'s session is confirmed/);
    expect(
      screen.getAllByRole("link", { name: /Open chat/i }).some((a) => a.getAttribute("href") === `/chat?s=${booking.id}&as=mentor`),
    ).toBe(true);
  });

  it("lets the junior into the room once it's accepted", () => {
    const booking = addBooking(DEMO_ACCOUNT, meeraSlot);
    render(<MentorDashboard />);
    fireEvent.click(screen.getByText(/Mon 11 AM/).closest("li")!.querySelector("button")!);
    cleanup();

    render(<StudentDashboard />);
    expect(screen.queryByText(/you're Meera J\. on the mentoring side/i)).toBeNull();
    expect(screen.getByText("Confirmed")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open session/i }).getAttribute("href")).toBe(
      `/chat?s=${booking.id}&as=student`,
    );
  });
});

describe("requesting a slot from a mentor the sample account isn't", () => {
  it("offers the labelled stand-in, because no inbox will ever see it", () => {
    addBooking(DEMO_ACCOUNT, { ...meeraSlot, mentorId: "vikram", mentorName: "Vikram D." });
    render(<StudentDashboard />);

    expect(screen.queryByText(/on the mentoring side/i)).toBeNull();
    expect(screen.getByRole("button", { name: /Accept as Vikram/i })).toBeTruthy();
  });
});
