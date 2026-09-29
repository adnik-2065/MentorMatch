import { requireUser } from "@/lib/server/auth";
import { handler, readJson } from "@/lib/server/http";
import { requestAdaptiveSuggestions } from "@/lib/roadmap/revisions";
import { adaptiveSchema } from "@/lib/roadmap/schemas";

export const maxDuration = 120;

/** Asks the coach for suggestions. They're stored as a pending revision — nothing changes yet. */
export const POST = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await readJson(req, adaptiveSchema);
  return Response.json(await requestAdaptiveSuggestions(user.id, id, input), { status: 201 });
});
