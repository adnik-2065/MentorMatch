import { cookies } from "next/headers";
import { getPool } from "@/server/db";
import { OWNER_COOKIE, OWNER_COOKIE_MAX_AGE } from "@/server/ownerToken";
import { getOwnProfile, putOwnProfile, type ApiResult } from "@/server/profileApi";
import { pgProfileStore } from "@/server/profileStore";

const MAX_BODY_BYTES = 32 * 1024;

function store() {
  const pool = getPool();
  return pool ? pgProfileStore(pool) : null;
}

async function respond({ status, body, setOwnerToken }: ApiResult) {
  if (setOwnerToken) {
    (await cookies()).set(OWNER_COOKIE, setOwnerToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OWNER_COOKIE_MAX_AGE,
    });
  }
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** The caller's own profile — there is no way to read anyone else's. */
export async function GET() {
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  return respond(await getOwnProfile(store(), token));
}

export async function PUT(request: Request) {
  // JSON-only means a cross-site form can't post here without a CORS preflight.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return respond({ status: 415, body: { error: "unsupported_media_type" } });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return respond({ status: 413, body: { error: "payload_too_large" } });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return respond({ status: 400, body: { error: "invalid_json" } });
  }

  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  return respond(await putOwnProfile(store(), token, body));
}
