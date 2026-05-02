import { Prisma } from '@prisma/client';
import { getDb } from '@/lib/db';

export type CompanyItem = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function listCompanies(): Promise<CompanyItem[]> {
  return await getDb().company.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
}

export async function getCompanyById(id: string): Promise<CompanyItem | null> {
  return await getDb().company.findUnique({
    where: { id },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
}

export async function createCompany(name: string): Promise<CompanyItem> {
  return await getDb().company.create({
    data: { name: name.trim() },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
}

export async function updateCompany(id: string, name: string): Promise<CompanyItem> {
  return await getDb().company.update({
    where: { id },
    data: { name: name.trim() },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
}

export async function deleteCompany(id: string): Promise<void> {
  await getDb().company.delete({ where: { id } });
}
