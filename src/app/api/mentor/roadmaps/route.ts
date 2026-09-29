import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { listSharedRoadmaps } from "@/lib/roadmap/service";

/** Roadmaps learners have explicitly shared with the signed-in mentor. */
export const GET = handler(async () => {
  const user = await requireUser();
  return Response.json({ roadmaps: await listSharedRoadmaps(user.id) });
});
