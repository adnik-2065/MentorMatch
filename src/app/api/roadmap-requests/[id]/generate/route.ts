import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { generateRoadmap } from "@/lib/roadmap/generate";

// A full roadmap is a long completion; give the provider room (retries included).
export const maxDuration = 300;

export const POST = handler(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const roadmap = await generateRoadmap(user.id, id);
  return Response.json({ id: roadmap.id }, { status: 201 });
});
