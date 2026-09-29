import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { OTP_MAX, OTP_MIN, profileSchema, type ProfileInput, type SessionUser } from "@/lib/auth-shared";
import { db } from "./db";
import { env } from "./env";
import { sendSignInCode } from "./email";
import { AppError, badRequest, tooManyRequests, unauthorized } from "./errors";

/**
 * College email + one-time code, backed by server-side sessions.
 *
 * The cookie carries a random 256-bit token; the database stores only its
 * SHA-256, so a leaked table can't be replayed as a session. Codes are
 * HMAC'd with AUTH_SECRET for the same reason.
 */

export const SESSION_COOKIE = "mm_session";
const SESSION_DAYS = 30;
const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_WINDOW_MS = 15 * 60 * 1000;
const CODES_PER_WINDOW = 5;
const MAX_CODE_ATTEMPTS = 5;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const hmac = (value: string) => createHmac("sha256", env().AUTH_SECRET).update(value).digest("hex");

function sameHash(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/* ─────────────────────────────── codes ─────────────────────────────── */

/**
 * Six digits from the CSPRNG, never starting with 0 — a code like "059346"
 * reads, pastes and gets retyped as five digits.
 */
export function generateOtpCode() {
  return String(randomInt(OTP_MIN, OTP_MAX + 1));
}

export async function requestSignInCode(email: string) {
  const since = new Date(Date.now() - CODE_WINDOW_MS);
  const recent = await db().otpChallenge.count({ where: { email, createdAt: { gte: since } } });
  if (recent >= CODES_PER_WINDOW) {
    throw tooManyRequests("Too many codes requested. Wait a few minutes and try again.", 15 * 60);
  }

  const code = generateOtpCode();
  await db().otpChallenge.create({
    data: { email, codeHash: hmac(`${email}:${code}`), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });
  await sendSignInCode(email, code);
}

/** Checks the newest live code for this email; returns the (possibly new) user. */
export async function verifySignInCode(email: string, code: string, profile?: ProfileInput) {
  const challenge = await db().otpChallenge.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) throw badRequest("That code has expired. Request a new one.");
  if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
    throw tooManyRequests("Too many wrong attempts. Request a new code.", 60);
  }

  if (!sameHash(challenge.codeHash, hmac(`${email}:${code}`))) {
    await db().otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    throw badRequest("That code isn't right. Check the email and try again.");
  }

  // Conditional update, so two simultaneous submits can't both spend one code.
  const spent = await db().otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (spent.count === 0) throw badRequest("That code was already used. Request a new one.");

  const fields = profile ? profileFields(profile) : {};
  return db().user.upsert({
    where: { email },
    create: { email, ...fields },
    update: fields,
  });
}

/** Onboarding lives in localStorage today; this copies it onto the account. */
export function profileFields(input: ProfileInput) {
  const p = profileSchema.parse(input);
  const fields: Record<string, unknown> = {
    learnTopics: p.learnTopics,
    teachTopics: p.teachTopics,
    isMentor: p.role === "mentor" || p.teachTopics.length > 0,
  };
  // Blank fields never wipe what the account already has.
  for (const key of ["name", "college", "year", "branch"] as const) if (p[key]) fields[key] = p[key];
  return fields;
}

/* ────────────────────────────── sessions ───────────────────────────── */

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db().authSession.create({ data: { userId, tokenHash: sha256(token), expiresAt } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function userForToken(token: string | undefined) {
  if (!token) return null;
  const session = await db().authSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}

export async function getCurrentUser() {
  return userForToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db().authSession.deleteMany({ where: { tokenHash: sha256(token) } });
  store.delete(SESSION_COOKIE);
}

export function toSessionUser(user: {
  id: string;
  email: string;
  name: string;
  year: string;
  branch: string;
  isMentor: boolean;
}): SessionUser {
  const { id, email, name, year, branch, isMentor } = user;
  return { id, email, name, year, branch, isMentor };
}

export function requireMentor(user: { isMentor: boolean }) {
  if (!user.isMentor) {
    throw new AppError(403, "not_a_mentor", "Claim at least one subject to teach to use mentor tools.");
  }
}
