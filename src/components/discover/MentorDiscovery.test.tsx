// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MentorDiscovery } from "./MentorDiscovery";
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
  usePathname: () => "/discover",
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

/** Open the first mentor's dialog and confirm whatever slot it preselects. */
function bookFirstMentor() {
  const buttons = screen.getAllByRole("button", { name: /^Book session$/ });
  fireEvent.click(buttons[0]);
  click(/Confirm booking/);
}

describe("MentorDiscovery", () => {
  it("offers a plain Book session with nothing pending", () => {
    render(<MentorDiscovery />);
    expect(screen.getAllByRole("button", { name: /^Book session$/ }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/already booked/i)).toBeNull();
  });

  it("says the request is pending after booking, and keeps saying it", () => {
    const { unmount } = render(<MentorDiscovery />);
    bookFirstMentor();

    expect(screen.getByText(/Request sent — you've already booked a session/)).toBeTruthy();
    expect(screen.getByText(/still pending/)).toBeTruthy();
    expect(screen.getByText(/awaiting confirmation/)).toBeTruthy();

    // Coming back later: the banner is driven by the store, not by what just happened.
    unmount();
    render(<MentorDiscovery />);
    expect(screen.getByText(/You've already booked a session/)).toBeTruthy();
    expect(screen.getByText(/awaiting confirmation/)).toBeTruthy();
  });

  it("turns that mentor's button into Book another slot", () => {
    render(<MentorDiscovery />);
    bookFirstMentor();

    expect(screen.getByRole("button", { name: /Book another slot/ })).toBeTruthy();
    // Everyone else is still a first ask.
    expect(screen.getAllByRole("button", { name: /^Book session$/ }).length).toBeGreaterThan(0);
  });

  it("will not offer a slot that is already held", () => {
    render(<MentorDiscovery />);
    bookFirstMentor();

    click(/Book another slot/);
    const held = screen.getByText(/· already requested/);
    expect((held.closest("button") as HTMLButtonElement).disabled).toBe(true);
  });
});
