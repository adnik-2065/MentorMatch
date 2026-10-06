import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPool, pgProfileStore, listPublicMentors } = vi.hoisted(() => ({
  getPool: vi.fn(),
  pgProfileStore: vi.fn(),
  listPublicMentors: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/server/db", () => ({ getPool }));
vi.mock("@/server/profileStore", () => ({ pgProfileStore }));
vi.mock("@/server/profileApi", () => ({ listPublicMentors }));

const { GET } = await import("./route");

describe("GET /api/mentors search parameters", () => {
  beforeEach(() => {
    getPool.mockReturnValue({});
    pgProfileStore.mockReturnValue("test-store");
    listPublicMentors.mockResolvedValue({ status: 200, body: { mentors: [] } });
  });

  it("passes submitted search and placement filters to the backend matcher", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/mentors?query=Java&topic=Java&topic=Docker&branch=CSE&company=Acme&role=SDE",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(listPublicMentors).toHaveBeenCalledWith("test-store", {
      query: "Java",
      topics: ["Java", "Docker"],
      branch: "CSE",
      targetCompanies: ["Acme"],
      targetRoles: ["SDE"],
    });
  });
});