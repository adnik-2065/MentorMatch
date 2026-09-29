"use client";

/**
 * Session rooms.
 *
 * A thread is derived from a session, not stored on its own — booking a
 * session opens the room, so there is never an orphan chat. Seeded
 * transcripts belong to the sample account only; your own rooms start with
 * a single system line and hold whatever you type until the backend lands
 * (`GET /api/threads`, `POST /api/threads/:id/messages`).
 */

import type { AccountId } from "./account";
import type { Doubt, Session } from "./dashboard";

export type ChatMessage = {
  id: string;
  from: "me" | "them" | "system";
  text: string;
  /** Display label, not a timestamp — the backend will send real ones. */
  at: string;
};

export type Thread = {
  id: string;
  with: string;
  year: string;
  branch: string;
  topic: string;
  concept: string;
  /** "Today · 6 PM", or "Async" for a doubt nobody has booked. */
  slot: string;
  /** Which hat you're wearing in this room. */
  role: "student" | "mentor";
  /** Who the composer says you're writing to — a doubt has no one person yet. */
  to: string;
  kind: "session" | "doubt";
  unread: number;
  seed: ChatMessage[];
};

/* --------------------------------- storage --------------------------------- */

const KEY = "mentormatch.chat.v1";

type Store = Partial<Record<AccountId, Record<string, ChatMessage[]>>>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

export function loadMessages(account: AccountId, threadId: string): ChatMessage[] {
  return read()[account]?.[threadId] ?? [];
}

export function appendMessage(account: AccountId, threadId: string, text: string): ChatMessage {
  const message: ChatMessage = {
    id: `msg-${Date.now().toString(36)}`,
    from: "me",
    text,
    at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
  };

  const store = read();
  const forAccount = store[account] ?? {};
  const next: Store = {
    ...store,
    [account]: { ...forAccount, [threadId]: [...(forAccount[threadId] ?? []), message] },
  };

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode — the message still shows for this visit.
  }

  return message;
}

/* ---------------------------------- seeds ---------------------------------- */

function system(id: string, text: string): ChatMessage {
  return { id, from: "system", text, at: "" };
}

/** Transcripts for the sample account, keyed by session id. */
const DEMO_TRANSCRIPTS: Record<string, ChatMessage[]> = {
  s1: [
    system("s1-0", "Room opens Today at 6 PM. Chat stays open before and after the session."),
    {
      id: "s1-1",
      from: "them",
      text: "Hi Aditya — send me a screenshot of your support conditions before we start, it'll save us ten minutes.",
      at: "5:41 PM",
    },
    { id: "s1-2", from: "me", text: "Sent. I've made both ends fixed supports.", at: "5:44 PM" },
    {
      id: "s1-3",
      from: "them",
      text: "That's your problem. Fixed at both ends over that span gives exactly the moments you're seeing — the real column isn't that rigid. We'll fix the model together at 6.",
      at: "5:45 PM",
    },
  ],
  s2: [
    system("s2-0", "Room opens Thu 2 Oct at 7 PM."),
    {
      id: "s2-1",
      from: "them",
      text: "Thu 7 PM works. Bring your problem set — we'll draw SFD and BMD for two of them end to end.",
      at: "Yesterday",
    },
  ],
  m1: [
    system("m1-0", "Room opens Today at 6 PM. Chat stays open before and after the session."),
    {
      id: "m1-1",
      from: "me",
      text: "Hi Aditya — send me a screenshot of your support conditions before we start, it'll save us ten minutes.",
      at: "5:41 PM",
    },
    { id: "m1-2", from: "them", text: "Sent. I've made both ends fixed supports.", at: "5:44 PM" },
    {
      id: "m1-3",
      from: "me",
      text: "That's your problem. Fixed at both ends over that span gives exactly the moments you're seeing. We'll fix the model together at 6.",
      at: "5:45 PM",
    },
  ],
  m2: [
    system("m2-0", "Room opens Tomorrow at 11 AM."),
    {
      id: "m2-1",
      from: "them",
      text: "Ma'am should I bring my drawing sheets, or is it fine on the tablet?",
      at: "9:12 AM",
    },
  ],
  d1: [
    system("d1-0", "Async doubt — no slot needed. Answer whenever you get a minute."),
    {
      id: "d1-1",
      from: "them",
      text: "Why does my cube test give lower strength at 28 days than at 7 days? Is the mix wrong?",
      at: "40 min ago",
    },
  ],
  d2: [
    system("d2-0", "Async doubt — no slot needed. Answer whenever you get a minute."),
    {
      id: "d2-1",
      from: "them",
      text: "How do I take out the quantity of steel for a two-way slab from the bar bending schedule?",
      at: "3 hours ago",
    },
  ],
};

/** Your own rooms open empty — one honest line rather than a fake greeting. */
function ownSeed(session: Session): ChatMessage[] {
  return [
    system(
      `${session.id}-0`,
      `Room opens ${session.day} at ${session.time}. Messages are saved on this device until the backend goes live.`,
    ),
  ];
}

/* --------------------------------- threads --------------------------------- */

function fromSession(session: Session, role: Thread["role"], demo: boolean): Thread {
  return {
    id: session.id,
    with: session.with,
    year: session.year,
    branch: session.branch,
    topic: session.topic,
    concept: session.concept,
    slot: `${session.day} · ${session.time}`,
    role,
    to: session.with.split(" ")[0],
    kind: "session",
    unread: session.unread,
    seed: (demo && DEMO_TRANSCRIPTS[session.id]) || ownSeed(session),
  };
}

function fromDoubt(doubt: Doubt): Thread {
  return {
    id: doubt.id,
    with: doubt.from,
    year: doubt.year,
    branch: "",
    topic: doubt.topic,
    concept: doubt.text,
    slot: "Async",
    role: "mentor",
    to: doubt.from.split(" ")[0],
    kind: "doubt",
    unread: doubt.answers === 0 ? 1 : 0,
    seed: DEMO_TRANSCRIPTS[doubt.id] ?? [],
  };
}

/**
 * A doubt you asked yourself. Nobody has claimed it yet, so the room is
 * addressed to whoever picks it up rather than to one senior.
 */
function fromAsked(doubt: Doubt): Thread {
  return {
    id: doubt.id,
    with: "Open to seniors",
    year: "",
    branch: "",
    topic: doubt.topic,
    concept: doubt.text,
    slot: "Async",
    role: "student",
    to: "your seniors",
    kind: "doubt",
    unread: 0,
    seed: [
      system(
        `${doubt.id}-0`,
        `Asked ${doubt.asked.toLowerCase()}. Any senior who claims ${doubt.topic} can pick this up — no slot needed.`,
      ),
    ],
  };
}

/**
 * Everything you can talk in, both hats at once — the room list doesn't care
 * whether you were the junior or the senior, only who you're talking to.
 *
 * A session the mentor hasn't accepted yet has no room: there's nobody on the
 * other side to read it, so offering a composer would be a lie.
 */
export function buildThreads({
  demo,
  learning = [],
  mentoring = [],
  doubts = [],
  asked = [],
}: {
  demo: boolean;
  learning?: Session[];
  mentoring?: Session[];
  doubts?: Doubt[];
  /** Doubts you asked. In the sample account they also reach your own feed — one room, not two. */
  asked?: Doubt[];
}): Thread[] {
  const accepted = (s: Session) => s.status !== "pending";
  const mine = new Set(asked.map((d) => d.id));

  return [
    ...learning.filter(accepted).map((s) => fromSession(s, "student", demo)),
    ...mentoring.filter(accepted).map((s) => fromSession(s, "mentor", demo)),
    ...asked.map(fromAsked),
    ...doubts.filter((d) => !mine.has(d.id)).map(fromDoubt),
  ];
}
