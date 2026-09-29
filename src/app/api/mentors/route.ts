import { connection } from "next/server";
import { getPool } from "@/server/db";
import { listPublicMentors } from "@/server/profileApi";
import { pgProfileStore } from "@/server/profileStore";

/** Registered, bookable mentors. Sample profiles are bundled with the client and not served here. */
export async function GET() {
  // Always read at request time — never bake the listing (or a "not configured" reply) into the build.
  await connection();
  const pool = getPool();
  const { status, body } = await listPublicMentors(pool ? pgProfileStore(pool) : null);
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
