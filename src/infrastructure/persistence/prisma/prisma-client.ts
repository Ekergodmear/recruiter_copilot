import { PrismaClient } from "@prisma/client";

let singleton: PrismaClient | null = null;
let singletonUrl: string | undefined;

export function getPrismaClient(databaseUrl?: string): PrismaClient {
  if (singleton && singletonUrl === databaseUrl) return singleton;
  if (singleton) {
    void singleton.$disconnect();
    singleton = null;
  }
  singleton = new PrismaClient(
    databaseUrl
      ? {
          datasources: {
            db: { url: databaseUrl },
          },
        }
      : undefined,
  );
  singletonUrl = databaseUrl;
  return singleton;
}

export async function disconnectPrisma(): Promise<void> {
  if (!singleton) return;
  await singleton.$disconnect();
  singleton = null;
  singletonUrl = undefined;
}

export type { PrismaClient };
