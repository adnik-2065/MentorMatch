// @vitest-environment jsdom
import { StrictMode } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { initialState } from "@/lib/onboarding";
import { CompleteStep } from "./CompleteStep";

const { saveProfile, syncProfile } = vi.hoisted(() => ({
  saveProfile: vi.fn(),
  syncProfile: vi.fn(),
}));

vi.mock("@/lib/account", () => ({ saveProfile, syncProfile }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

beforeEach(() => {
  saveProfile.mockReset();
  syncProfile.mockReset().mockResolvedValue({ status: "saved" });
});

afterEach(cleanup);

it("sends one profile save when Strict Mode reruns the completion effect", async () => {
  const state = { ...initialState, role: "mentor" as const, name: "Vedant" };
  render(<StrictMode><CompleteStep state={state} onReset={() => {}} /></StrictMode>);

  await waitFor(() => expect(syncProfile).toHaveBeenCalledTimes(1));
  expect(saveProfile).toHaveBeenCalledTimes(1);
});
