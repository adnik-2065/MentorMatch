import { Suspense } from "react";
import type { Metadata } from "next";
import { AskPage } from "@/components/doubt/AskPage";

export const metadata: Metadata = {
  title: "Ask a doubt · MentorMatch",
  description: "Post a question to every senior who claims the subject — no slot, no waiting.",
};

export default function Ask() {
  // The page reads ?topic= to preselect the subject, so it renders on the client.
  return (
    <Suspense
      fallback={<p className="mx-auto max-w-5xl px-5 py-20 text-sm text-faint sm:px-6">Loading…</p>}
    >
      <AskPage />
    </Suspense>
  );
}
