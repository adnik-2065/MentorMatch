import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryProfileStore } from "@/server/testing";

const jar = new Map<string, { value: string; options?: Record<string, unknown> }>();
let store: ReturnType<typeof memoryProfileStore> | null = null;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    set: (name: string, value: string, options: Record<string, unknown>) => jar.set(name, { value, options }),
  }),
}));
vi.mock("@/server/db", () => ({ getPool: () => (store ? {} : null) }));
vi.mock("@/server/profileStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/profileStore")>()),
  pgProfileStore: () => store,
}));

const { GET, PUT } = await import("./route");

const put = (body: string, contentType = "application/json") =>
  PUT(new Request("http://localhost/api/profile", { method: "PUT", headers: { "content-type": contentType }, body }));

const junior = JSON.stringify({
  role: "junior",
  name: "Asha Rao",
  college: "IIT Test",
  year: "2nd Year",
  branch: "CSE",
  learnTopics: ["DSA"],
});

beforeEach(() => {
  jar.clear();
  store = memoryProfileStore();
});

describe("/api/profile route", () => {
  it("returns 503 when the database isn't configured", async () => {
    store = null;
    expect((await put(junior)).status).toBe(503);
  });

  it("refuses non-JSON, oversized and malformed bodies", async () => {
    expect((await put(junior, "text/plain")).status).toBe(415);
    expect((await put("x".repeat(40_000))).status).toBe(413);
    expect((await put("{nope")).status).toBe(400);
    expect(store!.writes).toBe(0);
  });

  it("sets an httpOnly owner cookie on first save and reads back only that profile", async () => {
    const response = await put(junior);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const cookie = jar.get("mm_owner")!;
    expect(cookie.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });

    const own = await GET();
    expect(own.status).toBe(200);
    expect(await own.json()).toMatchObject({ profile: { name: "Asha Rao" } });

    jar.clear();
    expect((await GET()).status).toBe(404);
  });
});
