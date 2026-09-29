import "server-only";
import type { AiRequestKind } from "@/generated/prisma/client";
import { db } from "./db";
import { tooManyRequests } from "./errors";

/**
 * AI calls are the expensive thing a signed-in user can trigger, so they're
 * counted in Postgres rather than in memory — the limit holds across every
 * serverless instance. Failed calls count too; they still cost tokens.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const AI_LIMITS: Record<AiRequestKind, { windowMs: number; max: number; label: string }[]> = {
  ROADMAP_GENERATION: [
    { windowMs: HOUR, max: 5, label: "5 roadmaps an hour" },
    { windowMs: DAY, max: 15, label: "15 roadmaps a day" },
  ],
  ADAPTIVE: [
    { windowMs: HOUR, max: 10, label: "10 check-ins an hour" },
    { windowMs: DAY, max: 30, label: "30 check-ins a day" },
  ],
};

export async function assertAiQuota(userId: string, kind: AiRequestKind) {
  for (const limit of AI_LIMITS[kind]) {
    const since = new Date(Date.now() - limit.windowMs);
    const used = await db().aiRequest.count({ where: { userId, kind, createdAt: { gte: since } } });
    if (used >= limit.max) {
      throw tooManyRequests(
        `You've reached the limit of ${limit.label}. Try again later.`,
        Math.ceil(limit.windowMs / 1000),
      );
    }
  }
}
