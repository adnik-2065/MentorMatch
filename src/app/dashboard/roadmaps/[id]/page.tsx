import type { Metadata } from "next";
import { RoadmapView } from "@/components/roadmap/RoadmapView";

export const metadata: Metadata = {
  title: "Roadmap · MentorMatch",
  description: "Weekly milestones, tasks, checkpoints and progress.",
};

export default async function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoadmapView id={id} />;
}
