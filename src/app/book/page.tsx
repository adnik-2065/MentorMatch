import { Suspense } from "react";
import type { Metadata } from "next";
import { BookingPage } from "@/components/booking/BookingPage";

export const metadata: Metadata = {
  title: "Book a session · MentorMatch",
  description: "Find a senior for the subject you're stuck on and take one of their open slots.",
};

export default function Book() {
  // The page reads ?mentor= to preselect, so it renders on the client.
  return (
    <Suspense
      fallback={<p className="mx-auto max-w-5xl px-5 py-20 text-sm text-faint sm:px-6">Loading…</p>}
    >
      <BookingPage />
    </Suspense>
  );
}
