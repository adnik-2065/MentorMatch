import { requireUser } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";
import { decideRevision } from "@/lib/roadmap/revisions";
import { decisionSchema } from "@/lib/roadmap/schemas";

/** Accept or reject a suggestion — owner only. */
export const POST = handler(
  async (req, { params }: { params: Promise<{ id: string; revisionId: string }> }) => {
    const user = await requireUser();
    const { id, revisionId } = await params;
    const { decision } = await readJson(req, decisionSchema);
    return Response.json(await decideRevision(user.id, id, revisionId, decision));
  },
);
