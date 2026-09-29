import "server-only";
import { env } from "./env";
import { AppError } from "./errors";
import { log } from "./log";

/**
 * Sign-in codes go out through Resend. Without a key, development prints the
 * code to the server console so the flow can be exercised locally; production
 * refuses rather than silently accepting any code.
 */
export async function sendSignInCode(email: string, code: string) {
  const { RESEND_API_KEY, EMAIL_FROM, NODE_ENV } = env();

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    if (NODE_ENV === "production") {
      throw new AppError(
        503,
        "email_unavailable",
        "Sign-in emails aren't set up on this server yet. Please try again later.",
      );
    }
    console.info(`\n[dev] MentorMatch sign-in code for ${email}: ${code}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: email,
      subject: `${code} is your MentorMatch code`,
      text: `Your MentorMatch sign-in code is ${code}. It expires in 10 minutes.\n\nIf you didn't ask for it, ignore this email.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    log.error("email.send_failed", new Error(`Resend responded ${res.status}`));
    throw new AppError(502, "email_failed", "We couldn't send the code. Please try again in a minute.");
  }
}
