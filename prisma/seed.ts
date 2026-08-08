import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, SeasonStatus } from "../src/generated/prisma/client";

// The seed runs outside Next.js, so it builds its own client rather than
// reusing the hot-reload singleton in src/lib/prisma.ts.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL / DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const name = "Musim Tanam 1";

  const existing = await prisma.season.findFirst({ where: { name } });

  if (existing) {
    console.log(`Season "${name}" sudah ada (${existing.id}), seed dilewati.`);
    return;
  }

  const season = await prisma.season.create({
    data: {
      name,
      variety: "Rawit Ori 212",
      plantCount: 5000,
      // 45 hari lalu, supaya dashboard punya HST yang masuk akal.
      startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      status: SeasonStatus.ACTIVE,
      notes: "Musim perdana proyek komunitas.",
    },
  });

  console.log(`Season "${season.name}" dibuat (${season.id}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
