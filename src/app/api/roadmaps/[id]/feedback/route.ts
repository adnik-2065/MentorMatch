import { requireUser } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";
import { feedbackSchema } from "@/lib/roadmap/schemas";
import { addFeedback } from "@/lib/roadmap/service";

/** Mentor comments and session recommendations. Needs an active share. */
export const POST = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await readJson(req, feedbackSchema);
  return Response.json(await addFeedback(user.id, id, input), { status: 201 });
});
