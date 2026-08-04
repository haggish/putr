import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.note.count();
  if (count > 0) {
    console.log(`Seed skipped — ${count} notes already exist.`);
    return;
  }

  await prisma.note.createMany({
    data: [
      { title: "Read the README", body: "Get the app running in WSL2." },
      { title: "Set up Postgres", body: "Docker or apt — your call.", done: true },
      { title: "Ship something boring", body: "Boring is reliable." },
    ],
  });

  console.log("Seeded 3 example notes.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
