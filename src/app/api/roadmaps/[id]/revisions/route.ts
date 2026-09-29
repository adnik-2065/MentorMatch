import { requireUser } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";
import { proposeMentorRevision } from "@/lib/roadmap/revisions";
import { proposalSchema } from "@/lib/roadmap/schemas";

/** A mentor's proposed change. Needs an active share; the learner decides whether it applies. */
export const POST = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await readJson(req, proposalSchema);
  return Response.json(await proposeMentorRevision(user.id, id, input), { status: 201 });
});
