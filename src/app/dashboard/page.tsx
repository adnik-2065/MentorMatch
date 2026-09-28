import type { Metadata } from "next";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";

export const metadata: Metadata = {
  title: "Your learning · MentorMatch",
  description: "Upcoming sessions, mentors and recaps.",
};

export default function StudentDashboardPage() {
  return <StudentDashboard />;
}
