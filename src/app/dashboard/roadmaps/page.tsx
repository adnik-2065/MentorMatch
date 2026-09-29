import type { Metadata } from "next";
import { RoadmapList } from "@/components/roadmap/RoadmapList";

export const metadata: Metadata = {
  title: "Learning roadmaps · MentorMatch",
  description: "Your AI-generated, week-by-week learning plans and progress.",
};

export default function RoadmapsPage() {
  return <RoadmapList />;
}
