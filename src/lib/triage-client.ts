"use client";

/**
 * Talking to `/api/triage` and `/api/recap` from the browser.
 *
 * Both always resolve. If the route is unreachable — offline, a static export,
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
