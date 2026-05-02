import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const [, , username, newPassword] = process.argv;

if (!username || !newPassword) {
  console.error('Usage: npm run reset-password <username> <new-password>');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { username },
    data: { passwordHash: await hashPassword(newPassword) },
    select: { username: true },
  });

  console.log(`Password reset for ${user.username}.`);
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
