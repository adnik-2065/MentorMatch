import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { listRoadmaps } from "@/lib/roadmap/service";

export const GET = handler(async () => {
  const user = await requireUser();
  return Response.json(await listRoadmaps(user.id));
});
