import { describe, expect, it, vi } from "vitest";

// Wrap the real CSPRNG so we can see how it's called without changing what it returns.
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomInt: vi.fn(actual.randomInt) };
});

import { randomInt } from "node:crypto";
import { normalizeOtpInput, otpCodeSchema } from "@/lib/auth-shared";
import { generateOtpCode } from "@/lib/server/auth";

describe("OTP generation", () => {
  it("always produces exactly six digits with no leading zero", () => {
    for (let i = 0; i < 20_000; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^[1-9]\d{5}$/);
      const n = Number(code);
      expect(n).toBeGreaterThanOrEqual(100_000);
      expect(n).toBeLessThanOrEqual(999_999);
    }
  });

  it("draws from node:crypto's randomInt over the full 100000–999999 range", () => {
    vi.mocked(randomInt).mockClear();
    generateOtpCode();
    // randomInt's max is exclusive, so 1_000_000 makes 999_999 reachable.
    expect(randomInt).toHaveBeenCalledWith(100_000, 1_000_000);
  });

  it("produces both range endpoints correctly", () => {
    vi.mocked(randomInt).mockReturnValueOnce(100_000 as never).mockReturnValueOnce(999_999 as never);
    expect(generateOtpCode()).toBe("100000");
    expect(generateOtpCode()).toBe("999999");
  });

  it("isn't predictable — codes vary", () => {
    const codes = new Set(Array.from({ length: 200 }, generateOtpCode));
    expect(codes.size).toBeGreaterThan(190);
  });
});

describe("OTP verification format", () => {
  it("accepts exactly six digits, trimming surrounding whitespace", () => {
    expect(otpCodeSchema.parse("459346")).toBe("459346");
    expect(otpCodeSchema.parse(" 459346\n")).toBe("459346");
  });

  it("rejects five, seven, non-digit and empty codes", () => {
    for (const bad of ["59346", "4593461", "45934a", "45 9346", "", "①②③④⑤⑥"]) {
      expect(otpCodeSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe("OTP input normalisation (sign-in form)", () => {
  it("keeps all six digits when a pasted code has spaces or a prefix", () => {
    expect(normalizeOtpInput(" 459346")).toBe("459346");
    expect(normalizeOtpInput("459 346")).toBe("459346");
    expect(normalizeOtpInput("code: 459346")).toBe("459346");
  });

  it("caps at six digits and drops non-digits", () => {
    expect(normalizeOtpInput("45934612")).toBe("459346");
    expect(normalizeOtpInput("45a9")).toBe("459");
  });
});
