"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui";
import { DashboardGate, DashboardShell, EmptyState } from "@/components/dashboard/Shell";
import { IconArrowLeft, IconArrowRight, IconClock, IconSend, IconSparkle } from "@/components/icons";
import { mentorView, studentView, useAccount } from "@/lib/account";
import { appendMessage, buildThreads, loadMessages, type ChatMessage, type Thread } from "@/lib/chat";
import { doubtToFeed } from "@/lib/doubts";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

function ThreadList({
  threads,
  activeId,
  unreadFor,
  onOpen,
}: {
  threads: Thread[];
  activeId: string | null;
  unreadFor: (thread: Thread) => number;
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="space-y-1.5" aria-label="Conversations">
      {threads.map((thread) => {
        const active = thread.id === activeId;
        const unread = unreadFor(thread);
        return (
          <li key={thread.id}>
            <button
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => onOpen(thread.id)}
              className={`w-full cursor-pointer rounded-xl border p-3.5 text-left transition-colors duration-200 ${focus} ${
                active
                  ? "border-primary bg-primary-soft/50"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="truncate font-sans text-sm font-semibold text-fg">
                  {thread.with}
                </span>
                {unread > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-on-primary tabular-nums">
                    {unread}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-muted">{thread.topic}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-faint">
                <IconClock className="h-3 w-3 shrink-0" />
                {thread.slot}
                <span className="ml-auto shrink-0">
                  {thread.role === "student" ? "Learning" : "Mentoring"}
                </span>
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  if (message.from === "system") {
    return (
      <li className="my-2 text-center">
        <span className="inline-block max-w-[46ch] rounded-full bg-inset px-3.5 py-1.5 text-xs leading-relaxed text-faint">
          {message.text}
        </span>
      </li>
    );
  }

  const mine = message.from === "me";
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%] sm:max-w-[68%]">
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            mine
              ? "rounded-br-sm bg-primary text-on-primary"
              : "rounded-bl-sm border border-line bg-surface text-fg"
          }`}
        >
          {message.text}
        </div>
        {message.at && (
          <p className={`mt-1 text-[11px] text-faint ${mine ? "text-right" : ""}`}>{message.at}</p>
        )}
      </div>
    </li>
  );
}

function Composer({ to, onSend }: { to: string; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");

  function send() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <form
      className="flex items-end gap-2 border-t border-line p-3"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label htmlFor="chat-draft" className="sr-only">
        Message {to}
      </label>
      <textarea
        id="chat-draft"
        rows={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends, Shift+Enter breaks the line — what everyone expects in a chat.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={`Message ${to}…`}
        className={`max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-fg transition-colors duration-200 placeholder:text-faint hover:border-line-strong focus-visible:border-primary ${focus}`}
      />
      <button
        type="submit"
        disabled={!draft.trim()}
        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45 ${focus}`}
      >
        <IconSend />
        <span className="hidden sm:inline">Send</span>
      </button>
    </form>
  );
}

export function ChatPage() {
  const { ready, account, profile, bookings, doubts } = useAccount();
  const params = useSearchParams();
  const router = useRouter();

  const [sent, setSent] = useState<ChatMessage[]>([]);
  const [opened, setOpened] = useState<string[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const student = ready && account ? studentView(account, profile, bookings) : null;
  const mentor = ready && account ? mentorView(account, profile, bookings, doubts) : null;
  const threads = buildThreads({
    demo: account === "demo",
    learning: student?.sessions ?? [],
    mentoring: mentor?.sessions ?? [],
    doubts: mentor?.doubts ?? [],
    asked: doubts.map((d) => doubtToFeed(d, student?.name ?? "You", student?.year ?? "")),
  });

  const requested = params.get("s");
  const active = threads.find((t) => t.id === requested) ?? threads[0] ?? null;
  const activeId = active?.id ?? null;

  // Each room keeps its own history, so reload whenever the selection changes.
  useEffect(() => {
    if (!account || !activeId) return;
    setSent(loadMessages(account, activeId));
    setOpened((list) => (list.includes(activeId) ? list : [...list, activeId]));
  }, [account, activeId]);

  const messages = active ? [...active.seed, ...sent] : [];

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activeId]);

  if (!ready || !account) {
    return (
      <DashboardGate
        ready={ready}
        signedIn={false}
        title="Sign in to open your chats"
        body="Every accepted session and every doubt you ask gets a room here. Finish onboarding to get yours, or open the sample account to see one mid-conversation."
        cta={{ href: "/signin", label: "Go to sign in" }}
      />
    );
  }

  const unreadFor = (thread: Thread) => (opened.includes(thread.id) ? 0 : thread.unread);
  const totalUnread = threads.reduce((n, t) => n + unreadFor(t), 0);
  const name = student?.name ?? mentor?.name ?? profile?.name?.trim() ?? "You";
  const meta = [student?.year ?? mentor?.year ?? "", student?.branch ?? mentor?.branch ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <DashboardShell
      role={active?.role ?? (student ? "student" : "mentor")}
      name={name}
      meta={meta}
      demo={account === "demo"}
      unread={totalUnread}
    >
      <h1 className="font-sans text-2xl font-semibold text-fg sm:text-3xl">Chat</h1>
      <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-muted">
        One room per accepted session, and one per doubt you asked. A session room stays open
        before and after the slot; a doubt room is open from the moment you post it.
      </p>

      {threads.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No conversations yet"
            body="A session room opens once the mentor accepts your slot — or, wearing the other hat, once you accept a junior's. A doubt opens one straight away."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/ask"
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover ${focus}`}
                >
                  Ask a doubt
                  <IconArrowRight />
                </Link>
                <Link
                  href="/book"
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium text-fg transition-colors duration-200 hover:bg-inset ${focus}`}
                >
                  Book a session
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[17rem_1fr]">
          <div className={requested ? "hidden lg:block" : "block"}>
            <ThreadList
              threads={threads}
              activeId={activeId}
              unreadFor={unreadFor}
              onOpen={(id) => router.replace(`/chat?s=${id}`, { scroll: false })}
            />
          </div>

          {active && (
            <section
              aria-label={`Conversation with ${active.with}`}
              className={`flex h-[34rem] flex-col rounded-xl border border-line bg-inset ${
                requested ? "flex" : "hidden lg:flex"
              }`}
            >
              <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-3">
                <button
                  type="button"
                  onClick={() => router.replace("/chat", { scroll: false })}
                  className={`-ml-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm text-muted transition-colors duration-200 hover:bg-inset hover:text-fg lg:hidden ${focus}`}
                >
                  <IconArrowLeft />
                  All chats
                </button>

                <div className="min-w-0">
                  <h2 className="truncate font-sans text-sm font-semibold text-fg">{active.with}</h2>
                  <p className="truncate text-xs text-faint">
                    {[active.year, active.branch].filter(Boolean).join(" · ")}
                  </p>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Badge>{active.topic}</Badge>
                  <Badge tone={active.kind === "doubt" ? "neutral" : "primary"}>
                    <IconClock className="h-3 w-3" />
                    {active.slot}
                  </Badge>
                </div>
              </header>

              {active.kind === "session" && active.concept && (
                <p className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5 text-xs text-muted">
                  <span className="text-primary-text">
                    <IconSparkle className="h-3.5 w-3.5" />
                  </span>
                  Concept gap: <span className="font-medium text-fg">{active.concept}</span>
                </p>
              )}

              {/* The live region is the scroller, so the list keeps its list semantics. */}
              <div
                ref={scroller}
                role="log"
                aria-live="polite"
                aria-label="Messages"
                className="flex-1 overflow-y-auto px-4 py-4"
              >
                <ul className="space-y-3">
                  {messages.map((message) => (
                    <Bubble key={message.id} message={message} />
                  ))}
                </ul>
              </div>

              <Composer
                to={active.to}
                onSend={(text) => setSent((list) => [...list, appendMessage(account, active.id, text)])}
              />
            </section>
          )}
        </div>
      )}

      <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-faint">
        {account === "demo"
          ? "Sample account — these transcripts are seeded so you can see a room in use. Anything you send stays in the sample account."
          : "Messages are saved in this browser. Delivery, notifications and AI recaps arrive with the backend."}
      </p>
    </DashboardShell>
  );
}
