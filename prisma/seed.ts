import dotenv from 'dotenv';
import { PrismaClient } from '../generated/prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { email: 'alice@example.com', banned: false, deleted: false },
      { email: 'bob@example.com', banned: false, deleted: false },
      { email: 'banned.user@example.com', banned: true, deleted: false },
      { email: 'deleted.user@example.com', banned: false, deleted: true },
    ],
  });

  const activeUsers = await prisma.user.findMany({
    where: {
      banned: false,
      deleted: false,
    },
  });

  console.log(
    `Seed completed. Active users ready for development: ${activeUsers.length}`,
  );
}

async function run() {
  try {
    await main();
  } catch (error: unknown) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void run();
