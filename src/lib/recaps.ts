"use client";

/**
 * Step 5 of the flow — the recap a session leaves behind.
 *
 * Written by `/api/recap` and kept per account, like bookings and doubts.
 * `done` is derived from which next steps are ticked, never stored on its own,
 * so the progress bar can't drift away from the checkboxes.
 */

import type { AccountId } from "./account";
import type { Recap } from "./dashboard";

export type StoredRecap = Recap & {
  /** The session or doubt this came out of — one recap per room. */
  sessionId: string;
  /** Indices into `nextSteps` that are ticked off. */
  checked: number[];
  at: number;
};

const KEY = "mentormatch.recaps.v1";

type Store = Partial<Record<AccountId, StoredRecap[]>>;

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
    // Private mode or a full quota — the recap just won't survive a reload.
  }
}

export function loadRecaps(account: AccountId): StoredRecap[] {
  return read()[account] ?? [];
}

/** "Just now" is wrong by tomorrow, so recaps carry the date they were written. */
function today(at: number): string {
  return new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * One recap per room. Regenerating replaces the old one rather than stacking a
 * second copy of the same session in the vault.
 */
export function saveRecap(
  account: AccountId,
  input: {
    sessionId: string;
    topic: string;
    title: string;
    points: string[];
    nextSteps: string[];
    source: "ai" | "offline";
  },
): StoredRecap {
  const store = read();
  const existing = store[account] ?? [];
  const at = Date.now();

  const recap: StoredRecap = {
    id: `rc-${input.sessionId}`,
    sessionId: input.sessionId,
    topic: input.topic,
    title: input.title,
    date: today(at),
    tasks: input.nextSteps.length,
    done: 0,
    points: input.points,
    nextSteps: input.nextSteps,
    source: input.source,
    checked: [],
    at,
  };

  write({
    ...store,
    [account]: [recap, ...existing.filter((r) => r.sessionId !== input.sessionId)],
  });
  return recap;
}

export function toggleRecapStep(account: AccountId, id: string, index: number) {
  const store = read();
  const next = (store[account] ?? []).map((recap) => {
    if (recap.id !== id) return recap;
    const checked = recap.checked.includes(index)
      ? recap.checked.filter((i) => i !== index)
      : [...recap.checked, index];
    return { ...recap, checked, done: checked.length };
  });
  write({ ...store, [account]: next });
}

export function removeRecap(account: AccountId, id: string) {
  const store = read();
  write({ ...store, [account]: (store[account] ?? []).filter((r) => r.id !== id) });
}
