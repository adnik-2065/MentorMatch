import { requireUser } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";
import { shareSchema } from "@/lib/roadmap/schemas";
import { shareRoadmap } from "@/lib/roadmap/service";

export const POST = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const { mentorId } = await readJson(req, shareSchema);
  return Response.json(await shareRoadmap(user.id, id, mentorId), { status: 201 });
});
