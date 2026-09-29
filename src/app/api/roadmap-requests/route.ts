import { requireUser } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";
import { preferenceSchema } from "@/lib/roadmap/schemas";
import { createPreference } from "@/lib/roadmap/service";

/** Saves the learner's answers. Generation is a separate call so a failure never loses them. */
export const POST = handler(async (req) => {
  const user = await requireUser();
  const input = await readJson(req, preferenceSchema);
  const request = await createPreference(user.id, input);
  return Response.json({ id: request.id }, { status: 201 });
});
