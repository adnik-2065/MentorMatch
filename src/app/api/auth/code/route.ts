import { requestCodeSchema } from "@/lib/auth-shared";
import { requestSignInCode } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";

/** Sends a six-digit sign-in code to a college email. */
export const POST = handler(async (req) => {
  const { email } = await readJson(req, requestCodeSchema);
  await requestSignInCode(email);
  return Response.json({ sent: true });
});
