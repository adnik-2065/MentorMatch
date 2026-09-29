import { requireUser } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";
import { deleteSchema } from "@/lib/roadmap/schemas";
import { deleteRoadmap, getRoadmap } from "@/lib/roadmap/service";

type Ctx = { params: Promise<{ id: string }> };

/** Owner or a mentor it's shared with; the payload is trimmed to the viewer's role. */
export const GET = handler(async (_req, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json({ roadmap: await getRoadmap(user.id, id) });
});

/** Permanent — the body must carry `{ confirm: true }`. */
export const DELETE = handler(async (req, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  await readJson(req, deleteSchema);
  await deleteRoadmap(user.id, id);
  return Response.json({ deleted: true });
});
