"use client";

/**
 * Talking to `/api/triage`, `/api/recap` and `/api/assistant` from the browser.
 *
 * They always resolve. If the route is unreachable — offline, a static export,
 * a dev server that isn't running the API — the keyword table answers instead
 * and the UI says so. A student never gets an error where an answer was
 * promised.
 */

import { runTriage, type Triage } from "./onboarding";

export type Recap = {
  title: string;
  points: string[];
  nextSteps: string[];
  source: "ai" | "offline";
};

export async function requestTriage(
  text: string,
  context: { branch?: string; topics?: string[] } = {},
): Promise<Triage> {
  try {
    const res = await fetch("/api/triage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, ...context }),
    });
    if (!res.ok) return runTriage(text, context);

    const data = (await res.json()) as Triage;
    // Trust the route's shape, but never render a card with no concept on it.
    return data.concept && data.topic ? data : runTriage(text, context);
  } catch {
    return runTriage(text, context);
  }
}

export type AssistantTurn = { role: "user" | "model"; text: string };

export type AssistantReply = { reply: string; source: "ai" | "offline" };

/** The study buddy. Never rejects — an unreachable route reads as the AI being down. */
export async function requestAssistant(
  turns: AssistantTurn[],
  context: { name?: string; year?: string; branch?: string; topics?: string[] } = {},
): Promise<AssistantReply> {
  const offline: AssistantReply = {
    reply:
      "I couldn't reach the model just now — try again in a moment. If it's urgent, post it as a doubt and any senior who claims the subject can pick it up.",
    source: "offline",
  };

  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ turns, context }),
    });
    if (!res.ok) return offline;

    const data = (await res.json()) as Partial<AssistantReply>;
    return data.reply ? { reply: data.reply, source: data.source ?? "offline" } : offline;
  } catch {
    return offline;
  }
}

export async function requestRecap(input: {
  topic: string;
  concept: string;
  transcript?: string[];
}): Promise<Recap | null> {
  try {
    const res = await fetch("/api/recap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Recap;
    return data.title && data.points?.length > 0 ? data : null;
  } catch {
    return null;
  }
}
