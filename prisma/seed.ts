import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();

  if (userCount === 0) {
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

  await prisma.category.createMany({
    data: [
      'Restaurant',
      'Vehicule',
      'Assurance',
      'Materiaux',
      'Salaires',
      'Loyers payes',
      'Reparations',
      'Services publics',
      'Frais bancaires',
      'Honoraires professionnels',
      'Marketing',
      'Telephone/Internet',
      'Fournitures bureau',
      'Voyages',
      'Autre depense',
    ].map((name) => ({ name, type: 'expense' })),
    skipDuplicates: true,
  });

  await prisma.category.createMany({
    data: [
      'Loyers recus',
      'Honoraires recus',
      'Dividendes',
      'Vente',
      'Remboursement',
      'Autre recette',
    ].map((name) => ({ name, type: 'income' })),
    skipDuplicates: true,
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
