import { requireUser } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";
import { taskUpdateSchema } from "@/lib/roadmap/schemas";
import { updateTask } from "@/lib/roadmap/service";

/** Tick a task off (or back on) and keep a private note — owner only. */
export const PATCH = handler(async (req, { params }: { params: Promise<{ id: string; taskId: string }> }) => {
  const user = await requireUser();
  const { id, taskId } = await params;
  const input = await readJson(req, taskUpdateSchema);
  return Response.json({ task: await updateTask(user.id, id, taskId, input) });
});
