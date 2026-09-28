import type { Metadata } from "next";
import { MentorDashboard } from "@/components/dashboard/MentorDashboard";

export const metadata: Metadata = {
  title: "Your mentoring · MentorMatch",
  description: "Requests, sessions, availability and your MentorScore.",
};

export default function MentorDashboardPage() {
  return <MentorDashboard />;
}
