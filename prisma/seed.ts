import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, Role, SeasonStatus } from "../src/generated/prisma/client";

// The seed runs outside Next.js, so it builds its own client rather than
// reusing the hot-reload singleton in src/lib/prisma.ts.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL / DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * The four roles from the PRD. Passwords are placeholders — authentication is
 * not built yet, and these accounts exist only so tasks have someone to be
 * assigned to.
 */
const members = [
  { name: "Atras", email: "admin@kangcabe.id", role: Role.ADMIN },
  { name: "Tole", email: "agronomis@kangcabe.id", role: Role.AGRONOMIST },
  { name: "Gotay", email: "logistik@kangcabe.id", role: Role.LOGISTICS },
  { name: "Ican", email: "sales@kangcabe.id", role: Role.SALES },
];

async function seedMembers() {
  for (const member of members) {
    await prisma.user.upsert({
      where: { email: member.email },
      // Name and role are reconciled on every run, so renaming a member here
      // updates the existing row instead of being ignored.
      update: { name: member.name, role: member.role },
      create: { ...member, password: "not-set" },
    });
  }

  console.log(`${members.length} anggota tersedia.`);
}

async function seedSeason() {
  const name = "Musim Tanam 1";
  const existing = await prisma.season.findFirst({ where: { name } });

  if (existing) {
    console.log(`Season "${name}" sudah ada (${existing.id}), dilewati.`);
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

async function main() {
  await seedMembers();
  await seedSeason();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
