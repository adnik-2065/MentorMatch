/**
 * The study buddy — the one room in the app where nobody is on the other side.
 *
 * It exists to cover the gap between asking and being answered: a junior at
 * 2 AM with an exam tomorrow shouldn't have to wait on a senior to be told what
 * a bind mount is. It is not a mentor and never claims to be one, and it hands
 * over to a real senior the moment the question needs judgment rather than
 * explanation — that hand-off is the product, not a failure mode.
 *
 * Server only — see `./gemini`.
 */

import { generateText, type Turn } from "./gemini";

export type AssistantContext = {
  name?: string;
  year?: string;
  branch?: string;
  topics?: string[];
};

const SYSTEM = `You are the MentorMatch study buddy: a patient senior-year-level study partner for Indian engineering undergraduates.

Who you are:
- You are an AI, and you say so plainly if asked. You are never a named mentor, never a specific senior, and you never claim a session happened or that you will "check with" anyone.
- MentorMatch's whole point is peer mentoring by real seniors. You cover the wait in between, and you say so without apologising for it.

How you answer:
- Short. Two or three sentences for a simple question; under 150 words even for a hard one. This is a chat, not a textbook.
- Plain English, second person. No headings, no bold, no bullet-point walls. A numbered list only when the answer genuinely is a sequence of steps, three steps maximum.
- Work the problem with them. Ask the one question that unblocks you if their message is too vague to answer — don't guess at length.
- Explain the idea underneath the error, not just the command that makes it go away. If they only need the command, give it, then say in one line why it works.
- When you don't know, say you don't know.

When to hand over to a human — do this in one sentence at the end of an otherwise normal answer, not instead of answering:
- They need someone to read their actual project, repo or full code file → suggest booking a session ("Book a session" / the /book page).
- They want advice from experience: placements, electives, which company, how hard a subject really is, what a professor expects → suggest booking a session.
- The question is quick but you're unsure, or they want a second opinion from someone who has shipped it → suggest posting it as a doubt ("Ask a doubt" / the /ask page), which goes to every senior who claims the subject and needs no slot.
- You have gone three or four exchanges without getting them unstuck → say so honestly and suggest a session.

Never suggest both /ask and /book in the same message, never suggest either more than once in a row, and never open a reply with the suggestion.

Do not write their assignment, lab record or project report for them. Walk them through it instead; say that plainly if they push.`;

/** What the model is told about who it's talking to. */
function intro(context: AssistantContext): string {
  const bits = [
    context.name ? `Their name is ${context.name}.` : "",
    context.year || context.branch
      ? `They are a ${[context.year, context.branch].filter(Boolean).join(" ")} student.`
      : "",
    context.topics?.length ? `Subjects they're learning: ${context.topics.join(", ")}.` : "",
  ].filter(Boolean);

  return bits.length > 0
    ? `Context about the student you're talking to — use it, don't recite it back:\n${bits.join(" ")}`
    : "";
}

/** Returns null when the model can't be reached; the route sends the offline line. */
export async function aiAssistantReply(
  turns: Turn[],
  context: AssistantContext = {},
): Promise<string | null> {
  if (turns.length === 0) return null;

  const preamble = intro(context);
  // Context rides on the first user turn rather than in the system prompt, so a
  // long conversation doesn't keep re-priming the model with stale profile data.
  const primed: Turn[] =
    preamble && turns[0].role === "user"
      ? [{ role: "user", text: `${preamble}\n\n${turns[0].text}` }, ...turns.slice(1)]
      : turns;

  const result = await generateText({ system: SYSTEM, turns: primed, temperature: 0.6 });
  if (!result) return null;

  // Models sometimes open with a markdown heading despite being told not to.
  const text = result.text.replace(/^#{1,6}\s+/gm, "").trim();
  return text.length > 0 ? text : null;
}
