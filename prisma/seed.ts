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

  await seedPaymentSources();
}

async function seedPaymentSources() {
  async function findCompanyContaining(...substrings: string[]) {
    for (const substring of substrings) {
      const company = await prisma.company.findFirst({
        where: { name: { contains: substring, mode: 'insensitive' } },
        select: { id: true },
      });
      if (company) return company;
    }
    return null;
  }

  const oreaCompany = await findCompanyContaining('ORÉA', 'OREA');
  const qc9522Company = await findCompanyContaining('9522', '9522-6536');
  const leviCompany = await findCompanyContaining('LeVi Capital', 'LeVi');

  const sources = [
    {
      name: 'Visa OREA',
      kind: 'card' as const,
      lastDigits: '0027',
      isPersonal: false,
      ownerCompanyId: oreaCompany?.id ?? null,
    },
    {
      name: 'Visa 9522-6536 QC INC.',
      kind: 'card' as const,
      lastDigits: '0016',
      isPersonal: false,
      ownerCompanyId: qc9522Company?.id ?? null,
    },
    {
      name: 'Visa LeVi Capital',
      kind: 'card' as const,
      lastDigits: '5025',
      isPersonal: false,
      ownerCompanyId: leviCompany?.id ?? null,
    },
    {
      name: 'Mastercard perso Olivier',
      kind: 'card' as const,
      lastDigits: '0310',
      isPersonal: true,
      ownerCompanyId: null,
    },
  ];

  for (const source of sources) {
    if (!source.isPersonal && !source.ownerCompanyId) {
      console.warn(`⚠ ownerCompany NOT FOUND for source: ${source.name}. Source NOT seeded.`);
      continue;
    }

    const existing = await prisma.paymentSource.findFirst({
      where: { name: source.name },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.paymentSource.create({
      data: source,
    });
  }
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
