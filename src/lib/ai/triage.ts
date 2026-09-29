/**
 * Step 2 of the flow — "AI understands".
 *
 * Gemini reads the doubt and names the topic, the concept gap underneath it and
 * the neighbouring ideas. It never picks the mentors: ranking runs on real
 * ratings and real availability in `rankMentors()`, so the list is the same
 * whether this file answered or the offline keyword table did.
 *
 * Server only — see `./gemini`.
 */

import { cleanList, generateJSON, type Schema } from "./gemini";
import { TOPICS, rankMentors, topicGroupsFor, type Triage } from "../onboarding";

const SYSTEM = `You triage doubts from Indian engineering undergraduates for a peer-mentoring platform.

A junior pastes an error, a screenshot description or a half-formed question. Your job is not to solve it — a senior will do that in the session. Your job is to name the *concept gap* underneath the symptom, so the right senior gets matched and the student knows what they actually need to learn.

Rules:
- "topic" must be copied exactly from the allowed subject list you are given. Pick the closest one; never invent a subject.
- "concept" is 2-6 words naming the gap, not the symptom. "Container lifecycle & volume mounts", not "Docker not working".
- "explanation" is one or two sentences, addressed to the student as "you", plain English, no preamble and no greeting. Say why the symptom happens and what the real gap is. Never give the full fix.
- "related" is 3-4 short neighbouring concepts they should read next. Title case, no sentences.
- If the doubt is too vague to place, choose the most likely subject from their own subjects and say plainly that you need more detail.`;

const SCHEMA: Schema = {
  type: "object",
  properties: {
    topic: { type: "string", description: "Exactly one subject from the allowed list" },
    concept: { type: "string", description: "The concept gap, 2-6 words" },
    explanation: { type: "string", description: "One or two sentences addressed to the student" },
    related: { type: "array", items: { type: "string" }, description: "3-4 related concepts" },
  },
  required: ["topic", "concept", "explanation", "related"],
};

type Raw = { topic?: string; concept?: string; explanation?: string; related?: unknown };

/** Returns null whenever the model can't be trusted — the caller falls back to `runTriage`. */
export async function aiTriage(
  text: string,
  context: { branch?: string; topics?: string[] } = {},
): Promise<Triage | null> {
  const doubt = text.trim();
  if (doubt.length < 12) return null;

  // Their own subjects first, then the rest of their branch. The model must pick
  // from these, so a Civil student can't be matched to a Kubernetes senior.
  const branchTopics = topicGroupsFor(context.branch ?? "").flatMap((g) => g.topics);
  const allowed = [...new Set([...(context.topics ?? []), ...branchTopics])];

  const result = await generateJSON<Raw>({
    system: SYSTEM,
    prompt: [
      `Branch: ${context.branch || "not given"}`,
      `Their subjects: ${context.topics?.join(", ") || "none picked yet"}`,
      `Allowed subject list: ${allowed.join(", ")}`,
      "",
      `Doubt: ${doubt.slice(0, 2000)}`,
    ].join("\n"),
    schema: SCHEMA,
  });

  if (!result) return null;

  // Models drift off the list occasionally; match case-insensitively, then give up.
  const asked = result.data.topic?.trim() ?? "";
  const topic =
    allowed.find((t) => t.toLowerCase() === asked.toLowerCase()) ??
    TOPICS.find((t) => t.toLowerCase() === asked.toLowerCase());

  const concept = result.data.concept?.trim();
  const explanation = result.data.explanation?.trim();
  if (!topic || !concept || !explanation) return null;

  return {
    topic,
    concept,
    explanation,
    related: cleanList(result.data.related, 4),
    source: "ai",
    mentors: rankMentors(topic, context.branch),
  };
}
