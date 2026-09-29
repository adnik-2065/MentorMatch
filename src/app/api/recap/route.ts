/**
 * POST /api/recap — a finished session in, a recap and next steps out.
 *
 * Same contract as `/api/triage`: the key stays server-side, and there's an
 * offline answer so the button still does something without one.
 */

import { NextResponse } from "next/server";
import { aiRecap } from "@/lib/ai/recap";

/** No key, or the model didn't answer — the concept is still enough to practise against. */
function offlineRecap(topic: string, concept: string) {
  return {
    title: `${concept} — what to take away from this ${topic} session`,
    points: [`Went through ${concept.toLowerCase()} in ${topic}`, "Worked through your own example"],
    nextSteps: [
      `Redo the same problem without notes and write down where ${concept.toLowerCase()} came in`,
      "Bring the next one you get stuck on to the same senior",
    ],
    source: "offline" as const,
  };
}

export async function POST(request: Request) {
  let body: { topic?: unknown; concept?: unknown; transcript?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const concept = typeof body.concept === "string" ? body.concept.trim() : "";
  if (!topic) return NextResponse.json({ error: "Which subject?" }, { status: 400 });

  const transcript = Array.isArray(body.transcript)
    ? body.transcript.filter((line): line is string => typeof line === "string")
    : [];

  const draft = await aiRecap({ topic, concept, transcript });

  return NextResponse.json(draft ? { ...draft, source: "ai" as const } : offlineRecap(topic, concept), {
    headers: { "cache-control": "no-store" },
  });
}
