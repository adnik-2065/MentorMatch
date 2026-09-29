"use client";

import { useEffect, useState } from "react";
import { MENTORS, type Mentor } from "./onboarding";

export type DirectoryStatus = "loading" | "live" | "unavailable" | "error";

/**
 * Registered mentors from the database, followed by the bundled sample
 * profiles. When the database isn't reachable the samples still show, and
 * `status` says so — the UI labels that state rather than hiding it.
 */
export function useMentorDirectory() {
  const [registered, setRegistered] = useState<Mentor[]>([]);
  const [status, setStatus] = useState<DirectoryStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mentors", { cache: "no-store" })
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
  }, []);

  return { mentors: [...registered, ...MENTORS], registeredCount: registered.length, status };
}
