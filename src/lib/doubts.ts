"use client";

/**
 * Doubts asked without booking anybody.
 *
 * A doubt goes to the pool, not to one person: any senior who claims the
 * subject can pick it up, so there's no slot to hold and nothing to accept.
 * Stored per account like bookings are — `POST /api/doubts` and
 * `GET /api/doubts?topic=` once the backend lands.
 */

import type { AccountId } from "./account";
import type { Doubt } from "./dashboard";

export type AskedDoubt = {
  id: string;
  topic: string;
  text: string;
  /** Concept gap from triage, when they ran it before asking. */
  concept: string;
  /** Epoch ms — the "3 hours ago" label is derived, never stored stale. */
  at: number;
};

const KEY = "mentormatch.doubts.v1";

type Store = Partial<Record<AccountId, AskedDoubt[]>>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Private mode or a full quota — the doubt just won't survive a reload.
  }
}

export function loadDoubts(account: AccountId): AskedDoubt[] {
  return read()[account] ?? [];
}

/** Two doubts asked inside the same millisecond would otherwise share an id. */
function nextId(taken: AskedDoubt[]): string {
  const base = `dt-${Date.now().toString(36)}`;
  let id = base;
  for (let n = 2; taken.some((d) => d.id === id); n++) id = `${base}-${n}`;
  return id;
}

export function addDoubt(account: AccountId, doubt: Omit<AskedDoubt, "id" | "at">): AskedDoubt {
  const store = read();
  const existing = store[account] ?? [];
  const asked: AskedDoubt = { ...doubt, id: nextId(existing), at: Date.now() };
  // Newest first: an unanswered doubt is the thing you came back to check.
  write({ ...store, [account]: [asked, ...existing] });
  return asked;
}

export function removeDoubt(account: AccountId, id: string) {
  const store = read();
  write({ ...store, [account]: (store[account] ?? []).filter((d) => d.id !== id) });
}

/** "Just now" reads better than a timestamp on something you asked a minute ago. */
export function askedLabel(at: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - at) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** The shape the doubt feed renders, whichever side is looking at it. */
export function doubtToFeed(
  doubt: AskedDoubt,
  from: string,
  year: string,
  answers = 0,
): Doubt {
  return {
    id: doubt.id,
    from,
    year,
    topic: doubt.topic,
    text: doubt.text,
    asked: askedLabel(doubt.at),
    answers,
  };
}
