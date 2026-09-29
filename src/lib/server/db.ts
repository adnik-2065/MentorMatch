import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

/*
 * One client per process. In development, hot reload re-evaluates this
 * module, so the instance is parked on globalThis to avoid leaking pools.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: env().DATABASE_URL }) });
}

export function db(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
