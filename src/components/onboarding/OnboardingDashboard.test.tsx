// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OnboardingDashboard } from "./OnboardingDashboard";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { configurable: true, value: createStorage() });
  window.localStorage.clear();
  // No server copy and no database — the UI must cope.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ error: "database_not_configured" }), { status: 503 })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const heading = () => screen.getByRole("heading", { level: 2 }).textContent;
const click = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }));

async function reachGoals() {
  render(<OnboardingDashboard />);
  click(/I need help/i);
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Asha Rao" } });
  fireEvent.change(screen.getByLabelText("College"), { target: { value: "IIT Test" } });
  fireEvent.click(screen.getByRole("radio", { name: "2nd Year" }));
  fireEvent.click(screen.getByRole("radio", { name: "CSE" }));
  click(/^Continue$/);
  expect(heading()).toBe("What do you want to learn?");
  fireEvent.click(screen.getAllByRole("switch")[0]);
  click(/^Continue with 1/);
  expect(heading()).toBe("Preparing for placements?");
}

describe("OnboardingDashboard", () => {
  it("shows inline errors and moves focus when Continue is pressed on an incomplete step", () => {
    render(<OnboardingDashboard />);
    click(/I need help/i);
    click(/^Continue$/);
    expect(heading()).toBe("A little context makes every match better");
    expect(screen.getByText("Enter your name.")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/4 fields need attention/);
    expect(document.activeElement).toBe(screen.getByLabelText("Name"));
  });

  it("keeps values when going back and forward", async () => {
    await reachGoals();
    click(/^Back$/);
    click(/^Back$/);
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Asha Rao");
    expect(screen.getByRole("radio", { name: "2nd Year" }).getAttribute("aria-checked")).toBe("true");
    click(/^Continue$/);
    expect(screen.getAllByRole("switch")[0].getAttribute("aria-checked")).toBe("true");
  });

  it("skips empty optional steps and ends with suggested mentors", async () => {
    await reachGoals();
    click(/Skip for now/);
    expect(heading()).toBe("What are you stuck on right now?");
    click(/Skip for now/);
    expect(heading()).toBe("Here's who can help");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(await screen.findByText(/sample profiles only/)).toBeTruthy();
  });

  it("offers Continue instead of Skip once a placement goal is entered", async () => {
    await reachGoals();
    const input = screen.getByLabelText("Target positions");
    fireEvent.change(input, { target: { value: "SDE" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.queryByRole("button", { name: /Skip for now/ })).toBeNull();
    click(/^Continue$/);
    click(/Skip for now/);
    const cards = screen.getAllByRole("heading", { level: 3 });
    expect(cards.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Matches all your goals/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Software Development Engineer \(SDE\) experience \(self-reported\)/).length).toBeGreaterThan(0);
  });
});
