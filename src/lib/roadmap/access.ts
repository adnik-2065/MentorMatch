import "server-only";
import { db } from "@/lib/server/db";
import { conflict, notFound } from "@/lib/server/errors";

/**
 * Every roadmap read and write goes through one of these. Ownership and
 * sharing are checked in the same query that loads the row, so there's no
 * window between "may I?" and "here it is". Missing and forbidden look
 * identical (404) so ids can't be probed.
 */

export type RoadmapRole = "owner" | "mentor";

export async function requireOwner(userId: string, roadmapId: string) {
  const roadmap = await db().learningRoadmap.findFirst({ where: { id: roadmapId, ownerId: userId } });
  if (!roadmap) throw notFound();
  return roadmap;
}

/** Owner, and the roadmap isn't archived — archived versions are kept read-only as history. */
export async function requireEditableOwner(userId: string, roadmapId: string) {
  const roadmap = await requireOwner(userId, roadmapId);
  if (roadmap.status === "ARCHIVED") {
    throw conflict("This is an archived version. Open the current roadmap to keep working.");
  }
  return roadmap;
}

/** A mentor sees a roadmap only while the learner's share is active. */
export async function requireSharedMentor(userId: string, roadmapId: string) {
  const roadmap = await db().learningRoadmap.findFirst({
    where: { id: roadmapId, shares: { some: { mentorId: userId, status: "ACTIVE" } } },
  });
  if (!roadmap) throw notFound();
  return roadmap;
}

export async function requireViewer(userId: string, roadmapId: string) {
  const roadmap = await db().learningRoadmap.findFirst({
    where: {
      id: roadmapId,
      OR: [{ ownerId: userId }, { shares: { some: { mentorId: userId, status: "ACTIVE" } } }],
    },
  });
  if (!roadmap) throw notFound();
  const role: RoadmapRole = roadmap.ownerId === userId ? "owner" : "mentor";
  return { roadmap, role };
}
