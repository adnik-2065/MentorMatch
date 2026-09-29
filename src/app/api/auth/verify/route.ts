import { verifyCodeSchema } from "@/lib/auth-shared";
import { createSession, toSessionUser, verifySignInCode } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";

/** Exchanges a valid code for a session cookie, creating the account on first sign-in. */
export const POST = handler(async (req) => {
  const { email, code, profile } = await readJson(req, verifyCodeSchema);
  const user = await verifySignInCode(email, code, profile);
  await createSession(user.id);
  return Response.json({ user: toSessionUser(user) });
});
