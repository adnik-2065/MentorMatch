import type { Metadata } from "next";
import { MentorRoadmapView } from "@/components/roadmap/MentorRoadmaps";

export const metadata: Metadata = {
  title: "Review roadmap · MentorMatch",
  description: "Review a learner's roadmap, leave feedback and suggest changes.",
};

export default async function SharedRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MentorRoadmapView id={id} />;
}
