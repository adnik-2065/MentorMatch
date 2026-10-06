/**
 * Framework-free request handling for /api/profile and /api/mentors, so the
 * rules (validation, ownership, "no database" reporting) are unit-testable.
 * The route files only translate cookies and bodies in and out.
 */

import { matchMentors, type MatchPreferences } from "@/lib/onboarding";
import { validateProfileInput } from "@/lib/profileValidation";
import { hashOwnerToken, isOwnerToken, newOwnerToken } from "./ownerToken";
import type { ProfileStore } from "./profileStore";

export type ApiResult = {
  status: number;
  body: unknown;
  /** Set when the caller had no owner token and one was created for them. */
  setOwnerToken?: string;
};

export const NOT_CONFIGURED: ApiResult = {
  status: 503,
  body: {
    error: "database_not_configured",
    message: "Profile storage isn't configured on this server (DATABASE_URL is missing).",
  },
};

const failure = (error: unknown): ApiResult => {
  console.error("[mentormatch] database error", error);
  return { status: 500, body: { error: "database_error", message: "We couldn't reach the profile database." } };
};

export async function getOwnProfile(store: ProfileStore | null, token: string | undefined): Promise<ApiResult> {
  if (!store) return NOT_CONFIGURED;
  if (!isOwnerToken(token)) return { status: 404, body: { error: "not_found" } };
  try {
    const profile = await store.findByOwner(hashOwnerToken(token));
    return profile ? { status: 200, body: { profile } } : { status: 404, body: { error: "not_found" } };
  } catch (error) {
    return failure(error);
  }
}

/** Creates the caller's profile on first write, then only ever updates that same one. */
export async function putOwnProfile(
  store: ProfileStore | null,
  token: string | undefined,
  body: unknown,
): Promise<ApiResult> {
  if (!store) return NOT_CONFIGURED;
  const result = validateProfileInput(body);
  if (!result.ok) return { status: 422, body: { error: "invalid_profile", errors: result.errors } };

  const ownerToken = isOwnerToken(token) ? token : newOwnerToken();
  try {
    const profile = await store.saveForOwner(hashOwnerToken(ownerToken), result.value);
    return {
      status: 200,
      body: { profile },
      ...(ownerToken !== token ? { setOwnerToken: ownerToken } : {}),
    };
  } catch (error) {
    return failure(error);
  }
}

export async function listPublicMentors(
  store: ProfileStore | null,
  preferences?: MatchPreferences,
): Promise<ApiResult> {
  if (!store) return NOT_CONFIGURED;
  try {
    const mentors = await store.listMentors();
    const results = preferences?.query?.trim()
      ? matchMentors(preferences, mentors).map((match) => match.mentor)
      : mentors;
    return { status: 200, body: { mentors: results } };
  } catch (error) {
    return failure(error);
  }
}
