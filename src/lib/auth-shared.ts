/**
 * Sign-in validation shared by the browser form and the server. The server
 * re-runs every one of these — the client copy is only for instant feedback.
 */

import { z } from "zod";

/** Same rule onboarding uses: institute addresses only (.edu, .ac.in, .ac.uk…). */
export const COLLEGE_EMAIL = /\.(edu|ac)\.[a-z]{2,}$|\.edu$/i;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Enter a valid email address")
  .refine((v) => COLLEGE_EMAIL.test(v), "Use your college email — it should end in .ac.in or .edu");

export const OTP_LENGTH = 6;
export const OTP_MIN = 100_000;
export const OTP_MAX = 999_999;

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "The code is 6 digits");

/**
 * Digits only, capped at six. Strip first, then cap — the other way round,
 * pasting " 459346" from a terminal keeps " 45934" and loses a digit.
 */
export function normalizeOtpInput(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

const shortText = (max: number) => z.string().trim().max(max).default("");
const topicList = z.array(z.string().trim().min(1).max(80)).max(60).default([]);

/** The onboarding profile stored in localStorage, copied to the account on sign-in. */
export const profileSchema = z.object({
  name: shortText(80),
  college: shortText(120),
  year: shortText(20),
  branch: shortText(40),
  role: z.enum(["junior", "mentor"]).nullable().default(null),
  learnTopics: topicList,
  teachTopics: topicList,
});

export type ProfileInput = z.input<typeof profileSchema>;

export const requestCodeSchema = z.object({ email: emailSchema });

export const verifyCodeSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
  profile: profileSchema.optional(),
});

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  year: string;
  branch: string;
  isMentor: boolean;
};
