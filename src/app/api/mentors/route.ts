import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { listMentors } from "@/lib/roadmap/service";

/** Mentors a learner can share a roadmap with — ones who teach the skill first. No emails. */
export const GET = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const skill = (req.nextUrl.searchParams.get("skill") ?? "").slice(0, 80);
  return Response.json({ mentors: await listMentors(user.id, skill) });
});
