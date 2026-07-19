/**
 * Minimal seed for Founder Alpha / smoke readiness.
 * Does not invent product features — only ensures schema is reachable.
 *
 * Usage: pnpm db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Smoke creates its own candidates/jobs. Seed only verifies DB write path.
  const markerId = "seed_health_marker";
  await prisma.pipelineActivity.upsert({
    where: { id: markerId },
    create: {
      id: markerId,
      jobId: "seed_job",
      submissionId: null,
      candidateId: null,
      type: "note",
      message: "TECH-001 seed health marker",
      actorId: "system",
      createdAt: new Date().toISOString(),
    },
    update: {
      message: "TECH-001 seed health marker",
      createdAt: new Date().toISOString(),
    },
  });
  console.log("✔ db:seed — health marker written");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
