/**
 * Composition root helpers for Prisma persistence (no Nest — plain factory).
 */
export {
  createRepositories,
  type AppRepositories,
  type PersistenceDriver,
} from "../create-repositories.js";
export { getPrismaClient, disconnectPrisma } from "./prisma-client.js";
