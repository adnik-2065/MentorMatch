import { Suspense } from "react";
import type { Metadata } from "next";
import { ChatPage } from "@/components/chat/ChatPage";

export const metadata: Metadata = {
  title: "Chat · MentorMatch",
  description: "One room per session — open before the slot, and after it.",
};

export default function Chat() {
  // ?s= picks the room, so the page renders on the client.
  return (
    <Suspense
      fallback={<p className="mx-auto max-w-5xl px-5 py-20 text-sm text-faint sm:px-6">Loading…</p>}
    >
      <ChatPage />
    </Suspense>
  );
}
