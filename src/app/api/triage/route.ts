/**
 * POST /api/triage — the doubt goes in, the concept gap comes out.
 *
 * This route exists so the Gemini key stays on the server. The client never
 * sees it; it sees a `Triage`, and a `source` telling it whether the model or
 * the offline keyword table answered.
 */

import { NextResponse } from "next/server";
import { aiTriage } from "@/lib/ai/triage";
import { runTriage } from "@/lib/onboarding";

export async function POST(request: Request) {
  let body: { text?: unknown; branch?: unknown; topics?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 12) {
    return NextResponse.json({ error: "Write a little more about the problem." }, { status: 400 });
  }

  const context = {
    branch: typeof body.branch === "string" ? body.branch : undefined,
    topics: Array.isArray(body.topics) ? body.topics.filter((t) => typeof t === "string") : [],
  };

  // The keyword table is the floor, not the error path — a student always gets
  // an answer, and the badge on the card says which one they got.
  const triage = (await aiTriage(text, context)) ?? runTriage(text, context);

  return NextResponse.json(triage, {
    headers: { "cache-control": "no-store" },
  });
}
