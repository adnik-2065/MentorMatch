import type { Metadata } from "next";
import { RoadmapForm } from "@/components/roadmap/RoadmapForm";

export const metadata: Metadata = {
  title: "Create a roadmap · MentorMatch",
  description: "Tell us what you want to learn and get a personalised weekly plan.",
};

export default function NewRoadmapPage() {
  return <RoadmapForm />;
}
