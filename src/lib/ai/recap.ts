/**
 * Step 5 of the flow — "recap & progress".
 *
 * Turns what happened in a session into a title, what was covered, and the
 * practice that follows from it. Given the room transcript it summarises that;
 * given only the topic and concept it writes the plan for the session instead
 * of inventing a conversation that didn't happen.
 *
 * Server only — see `./gemini`.
 */

import { cleanList, generateJSON, type Schema } from "./gemini";

export type RecapDraft = {
  title: string;
  points: string[];
  nextSteps: string[];
};

const SYSTEM = `You write the recap a junior engineering student reads after a 1:1 session with a senior.

Rules:
- "title" is one line naming what the session was really about, under 80 characters, no colon-prefixes like "Recap:".
- "points" are 2-4 things now understood, each a short phrase in past tense: "Fixed the volume mounting issue", "Understood bind mounts vs named volumes".
- "nextSteps" are 2-3 concrete things to do this week, each doable in under an hour: "Try the same setup with docker-compose", "Redo question 3 without looking at the notes".
- Plain English. No praise, no filler, no restating the rules back.
- If you are given a transcript, summarise only what is in it. If you are given no transcript, write the recap as the plan for that concept and keep every point about the concept itself.`;

const SCHEMA: Schema = {
  type: "object",
  properties: {
    title: { type: "string", description: "One line, under 80 characters" },
    points: { type: "array", items: { type: "string" }, description: "2-4 things now understood" },
    nextSteps: { type: "array", items: { type: "string" }, description: "2-3 practice tasks" },
  },
  required: ["title", "points", "nextSteps"],
};

export async function aiRecap({
  topic,
  concept,
  transcript = [],
}: {
  topic: string;
  concept: string;
  transcript?: string[];
}): Promise<RecapDraft | null> {
  const result = await generateJSON<Partial<RecapDraft>>({
    system: SYSTEM,
    prompt: [
      `Subject: ${topic}`,
      `Concept gap the session was booked for: ${concept}`,
      "",
      transcript.length > 0
        ? `Transcript:\n${transcript.slice(-40).join("\n").slice(0, 6000)}`
        : "Transcript: none — the room was empty, so write it from the concept alone.",
    ].join("\n"),
    schema: SCHEMA,
    temperature: 0.4,
  });

  if (!result) return null;

  const title = result.data.title?.trim();
  const points = cleanList(result.data.points, 4);
  const nextSteps = cleanList(result.data.nextSteps, 3);
  if (!title || points.length === 0 || nextSteps.length === 0) return null;

  return { title: title.slice(0, 120), points, nextSteps };
}
