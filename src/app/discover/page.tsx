import type { Metadata } from "next";
import { MentorDiscovery } from "@/components/discover/MentorDiscovery";

export const metadata: Metadata = {
  title: "Find a mentor · MentorMatch",
  description: "Find a senior matched to your topic, context and availability.",
};

export default function DiscoverPage() {
  return <MentorDiscovery />;
}
