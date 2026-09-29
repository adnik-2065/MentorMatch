import { createHash, randomBytes } from "node:crypto";

/*
 * Until real auth (NextAuth) lands, a profile belongs to whoever holds its
 * owner token: 32 random bytes in an httpOnly cookie, stored server-side only
 * as a sha256 hash. Profile ids are public (mentor listings), tokens never are,
 * so knowing someone's id doesn't let you read or edit their profile.
 */

export const OWNER_COOKIE = "mm_owner";
export const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function newOwnerToken() {
  return randomBytes(32).toString("base64url");
}

export function isOwnerToken(value: string | undefined): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function hashOwnerToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
