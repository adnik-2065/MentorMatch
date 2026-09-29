import { connection } from "next/server";
import { getPool } from "@/server/db";
import { listPublicMentors } from "@/server/profileApi";
import { pgProfileStore } from "@/server/profileStore";

/** Registered, bookable mentors. Sample profiles are bundled with the client and not served here. */
export async function GET(request: Request) {
  // Always read at request time — never bake the listing (or a "not configured" reply) into the build.
  await connection();
  const pool = getPool();
  const params = new URL(request.url).searchParams;
  const preferences = {
    query: params.get("query")?.slice(0, 200) ?? "",
    topics: params.getAll("topic").slice(0, 10),
    branch: params.get("branch")?.slice(0, 80) ?? "",
    targetCompanies: params.getAll("company").slice(0, 10),
    targetRoles: params.getAll("role").slice(0, 10),
  };
  const { status, body } = await listPublicMentors(pool ? pgProfileStore(pool) : null, preferences);
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
