/**
 * Thin Prisma lifecycle helper for TECH-001.
 * Repositories receive PrismaClient via DI; this module owns connect/disconnect.
 */
export { getPrismaClient, disconnectPrisma, type PrismaClient } from "./prisma-client.js";
