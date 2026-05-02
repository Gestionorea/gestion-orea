import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    return;
  }

  const password = process.env.OREA_ADMIN_PASSWORD;

  if (!password) {
    throw new Error('OREA_ADMIN_PASSWORD must be set to seed the owner user.');
  }

  await prisma.user.create({
    data: {
      username: 'olemieux',
      passwordHash: await hashPassword(password),
      role: 'owner',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
