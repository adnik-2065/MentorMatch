"use client";

import { useEffect, useState } from "react";
import { MENTORS, type MatchPreferences, type Mentor } from "./onboarding";

export type DirectoryStatus = "loading" | "live" | "unavailable" | "error";

/**
 * Registered mentors from the database, followed by the bundled sample
 * profiles. When the database isn't reachable the samples still show, and
 * `status` says so — the UI labels that state rather than hiding it.
 */
export function useMentorDirectory(preferences: MatchPreferences = {}) {
  const [registered, setRegistered] = useState<Mentor[]>([]);
  const [status, setStatus] = useState<DirectoryStatus>("loading");
  const params = new URLSearchParams();
  if (preferences.query?.trim()) params.set("query", preferences.query.trim());
  preferences.topics?.forEach((topic) => params.append("topic", topic));
  if (preferences.branch) params.set("branch", preferences.branch);
  preferences.targetCompanies?.forEach((company) => params.append("company", company));
  preferences.targetRoles?.forEach((role) => params.append("role", role));
  const requestUrl = `/api/mentors${params.size ? `?${params.toString()}` : ""}`;

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setRegistered([]);
    fetch(requestUrl, { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 503) return setStatus("unavailable");
        if (!response.ok) return setStatus("error");
        const body = await response.json();
        if (cancelled) return;
        setRegistered(Array.isArray(body.mentors) ? body.mentors : []);
        setStatus("live");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [requestUrl]);

  return { mentors: [...registered, ...MENTORS], registeredCount: registered.length, status };
}
