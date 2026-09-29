import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { revokeShare } from "@/lib/roadmap/service";

/** Stops sharing immediately; the mentor's next request gets a 404. */
export const DELETE = handler(
  async (_req, { params }: { params: Promise<{ id: string; shareId: string }> }) => {
    const user = await requireUser();
    const { id, shareId } = await params;
    await revokeShare(user.id, id, shareId);
    return Response.json({ revoked: true });
  },
);
