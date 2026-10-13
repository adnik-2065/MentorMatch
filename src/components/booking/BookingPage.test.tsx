// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BookingPage } from "./BookingPage";
import { initialState } from "@/lib/onboarding";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/book",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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

/** A junior who finished onboarding, so /book renders its search rather than the gate. */
function signedIn() {
  window.localStorage.setItem("mentormatch.account.v1", "me");
  window.localStorage.setItem(
    "mentormatch.profile.v1",
    JSON.stringify({
      ...initialState,
      role: "junior",
      name: "Asha Rao",
      college: "IIT Test",
      year: "2nd Year",
      branch: "CSE",
      learnTopics: ["Data Structures"],
    }),
  );
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { configurable: true, value: createStorage() });
  window.localStorage.clear();
  signedIn();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ error: "offline" }), { status: 503 })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const click = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }));

/**
 * Take the first slot still on offer and send the request. Held slots are
 * disabled, so this picks a genuinely free one on a second call.
 */
function askForFirstSlot() {
  const slot = screen
    .getAllByRole("button", { name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) / })
    .find((button) => !(button as HTMLButtonElement).disabled);
  if (!slot) throw new Error("no free slot on offer");
  const label = slot.textContent ?? "";
  fireEvent.click(slot);
  click(/^Ask for /);
  return label;
}

describe("BookingPage", () => {
  it("starts on the search, with no status panel before anything is booked", () => {
    render(<BookingPage />);
    expect(screen.getByRole("heading", { name: "Book a session" })).toBeTruthy();
    expect(screen.queryByText(/already booked/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Book another session/ })).toBeNull();
  });

  it("confirms the request was sent and says it is still pending", () => {
    render(<BookingPage />);
    askForFirstSlot();

    expect(screen.getByText(/Request sent — you've booked a session/)).toBeTruthy();
    expect(screen.getByText(/still pending/)).toBeTruthy();
    expect(screen.getByText(/hasn't accepted yet/)).toBeTruthy();
    expect(screen.getByText("Request sent")).toBeTruthy();
    expect(screen.getByText(/Still waiting on .* to accept/)).toBeTruthy();
  });

  it("offers booking another session, which brings the search back", () => {
    render(<BookingPage />);
    askForFirstSlot();

    click(/Book another session/);
    expect(screen.getByLabelText(/Search by subject/)).toBeTruthy();
    // The reminder stays, so the second ask never looks like the first one vanished.
    expect(screen.getByText(/You already have 1 request waiting/)).toBeTruthy();
  });

  it("returns to the status panel from the reminder, and counts both requests", () => {
    render(<BookingPage />);
    const first = askForFirstSlot();

    click(/Book another session/);
    const second = askForFirstSlot();
    expect(second).not.toBe(first);

    expect(screen.getByText(/Request sent — you've now booked 2 sessions/)).toBeTruthy();
    expect(screen.getByText(/They're still pending/)).toBeTruthy();
    expect(screen.getByText("2 awaiting")).toBeTruthy();
    // Only the newest is "sent"; the earlier one has moved on to awaiting.
    expect(screen.getByText("Request sent")).toBeTruthy();
    expect(screen.getByText("Awaiting confirmation")).toBeTruthy();
  });

  it("lands on the status panel, not the search, when a request is already waiting", () => {
    const { unmount } = render(<BookingPage />);
    askForFirstSlot();
    unmount();

    // Coming back later: the booking is in localStorage, the component state is gone.
    render(<BookingPage />);
    expect(screen.getByText(/You've already booked a session/)).toBeTruthy();
    expect(screen.getByText("Awaiting confirmation")).toBeTruthy();
    expect(screen.queryByText("Request sent")).toBeNull();
    expect(screen.getByRole("button", { name: /Book another session/ })).toBeTruthy();
  });
});
