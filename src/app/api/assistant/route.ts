/**
 * POST /api/assistant — the study buddy room.
 *
 * Same contract as the other two routes: the key stays server-side, and there
 * is an answer even when the model can't be reached. The offline answer doesn't
 * pretend to be the assistant thinking — it points at the two things that work
 * without a network round trip.
 */

import { NextResponse } from "next/server";
import { aiAssistantReply, type AssistantContext } from "@/lib/ai/assistant";
import type { Turn } from "@/lib/ai/gemini";

/** Keep the context window honest — the last few exchanges are what matter. */
const MAX_TURNS = 16;
const MAX_CHARS = 4000;

function parseTurns(value: unknown): Turn[] {
  if (!Array.isArray(value)) return [];

  const turns: Turn[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { role, text } = item as { role?: unknown; text?: unknown };
    if (role !== "user" && role !== "model") continue;
    if (typeof text !== "string" || !text.trim()) continue;
    turns.push({ role, text: text.trim().slice(0, MAX_CHARS) });
  }

  // Gemini rejects a conversation that doesn't start with the user.
  const start = turns.findIndex((t) => t.role === "user");
  return start === -1 ? [] : turns.slice(start).slice(-MAX_TURNS);
}

function parseContext(value: unknown): AssistantContext {
  if (!value || typeof value !== "object") return {};
  const { name, year, branch, topics } = value as Record<string, unknown>;
  return {
    name: typeof name === "string" ? name : undefined,
    year: typeof year === "string" ? year : undefined,
    branch: typeof branch === "string" ? branch : undefined,
    topics: Array.isArray(topics) ? topics.filter((t): t is string => typeof t === "string") : [],
  };
}

export async function POST(request: Request) {
  let body: { turns?: unknown; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  const turns = parseTurns(body.turns);
  if (turns.length === 0) {
    return NextResponse.json({ error: "Say something first." }, { status: 400 });
  }

  const reply = await aiAssistantReply(turns, parseContext(body.context));

  return NextResponse.json(
    reply
      ? { reply, source: "ai" as const }
      : {
          reply:
            "I can't reach the model right now, so I'd be guessing. The two things that still work: post it as a doubt and any senior who claims the subject can pick it up, or book a session if it needs a proper look.",
          source: "offline" as const,
        },
    { headers: { "cache-control": "no-store" } },
  );
}
