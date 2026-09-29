import { randomUUID } from "node:crypto";
import type { Mentor } from "@/lib/onboarding";
import type { ProfileInput } from "@/lib/profileValidation";
import { publicName, slotsFrom, type ProfileStore, type StoredProfile } from "./profileStore";

/** In-memory ProfileStore for tests — same contract as the Postgres one. */
export function memoryProfileStore(): ProfileStore & { rows: Map<string, StoredProfile>; writes: number } {
  const rows = new Map<string, StoredProfile>();
  const store = {
    rows,
    writes: 0,
    async findByOwner(ownerHash: string) {
      return rows.get(ownerHash) ?? null;
    },
    async saveForOwner(ownerHash: string, input: ProfileInput) {
      store.writes += 1;
      const saved = { ...input, id: rows.get(ownerHash)?.id ?? randomUUID(), updatedAt: new Date().toISOString() };
      rows.set(ownerHash, saved);
      return saved;
    },
    async listMentors(): Promise<Mentor[]> {
      return [...rows.values()]
        .filter((p) => p.role === "mentor" && p.teachTopics.length > 0)
        .map((p) => ({
          id: p.id,
          name: publicName(p.name),
          year: p.year,
          branch: p.branch,
          rating: 0,
          reviews: 0,
          skills: p.teachTopics,
          experience: p.experience,
          verified: "claimed" as const,
          online: false,
          slots: slotsFrom(p.availability),
          source: "registered" as const,
        }))
        .filter((m) => m.slots.length > 0);
    },
  };
  return store;
}
