import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const instruments = [
  { name: "guitar", displayName: "Guitar", iconEmoji: "\uD83C\uDFB8" },
  { name: "piano", displayName: "Piano", iconEmoji: "\uD83C\uDFB9" },
  { name: "bass", displayName: "Bass", iconEmoji: "\uD83C\uDFB5" },
  { name: "ukulele", displayName: "Ukulele", iconEmoji: "\uD83E\uDE95" },
  { name: "drums", displayName: "Drums", iconEmoji: "\uD83E\uDD41" },
];

async function main() {
  for (const instrument of instruments) {
    await prisma.instrument.upsert({
      where: { name: instrument.name },
      update: {},
      create: instrument,
    });
  }
  console.log("Seeded instruments:", instruments.map((i) => i.displayName).join(", "));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
