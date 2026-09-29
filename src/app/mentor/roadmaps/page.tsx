import type { Metadata } from "next";
import { MentorRoadmapList } from "@/components/roadmap/MentorRoadmaps";

export const metadata: Metadata = {
  title: "Shared roadmaps · MentorMatch",
  description: "Learning roadmaps learners have shared with you.",
};

export default function SharedRoadmapsPage() {
  return <MentorRoadmapList />;
}
