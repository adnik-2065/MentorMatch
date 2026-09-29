import { profileSchema } from "@/lib/auth-shared";
import { getCurrentUser, profileFields, requireUser, toSessionUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, readJson } from "@/lib/server/http";

/** The signed-in account, or null — never a 401, so pages can decide what to show. */
export const GET = handler(async () => {
  const user = await getCurrentUser();
  return Response.json({ user: user ? toSessionUser(user) : null });
});

/** Re-syncs the onboarding profile (still kept in localStorage) onto the account. */
export const PATCH = handler(async (req) => {
  const user = await requireUser();
  const profile = await readJson(req, profileSchema);
  const updated = await db().user.update({ where: { id: user.id }, data: profileFields(profile) });
  return Response.json({ user: toSessionUser(updated) });
});
