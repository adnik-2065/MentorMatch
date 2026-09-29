import { requireUser } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";
import { attemptSchema } from "@/lib/roadmap/schemas";
import { submitAttempt } from "@/lib/roadmap/service";

/** Grades a checkpoint quiz on the server — the answer key never reaches the learner's browser first. */
export const POST = handler(
  async (req, { params }: { params: Promise<{ id: string; milestoneId: string }> }) => {
    const user = await requireUser();
    const { id, milestoneId } = await params;
    const input = await readJson(req, attemptSchema);
    return Response.json(await submitAttempt(user.id, id, milestoneId, input), { status: 201 });
  },
);
