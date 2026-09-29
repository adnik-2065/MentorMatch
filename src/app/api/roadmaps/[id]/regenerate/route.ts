import { requireUser } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";
import { requireEditableOwner } from "@/lib/roadmap/access";
import { generateRoadmap } from "@/lib/roadmap/generate";
import { regenerateSchema } from "@/lib/roadmap/schemas";

export const maxDuration = 300;

/** New version from the same answers. The old one is archived unless deletion is confirmed. */
export const POST = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const { deletePrevious } = await readJson(req, regenerateSchema);
  const current = await requireEditableOwner(user.id, id);
  const roadmap = await generateRoadmap(user.id, current.preferenceId, { previousRoadmapId: id, deletePrevious });
  return Response.json({ id: roadmap.id }, { status: 201 });
});
