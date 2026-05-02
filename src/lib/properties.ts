import { getDb } from '@/lib/db';

export type PropertyItem = {
  id: string;
  name: string;
  address: string | null;
  companyId: string | null;
  company: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

const propertySelect = {
  id: true,
  name: true,
  address: true,
  companyId: true,
  company: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

export async function listProperties(): Promise<PropertyItem[]> {
  return await getDb().property.findMany({
    orderBy: { name: 'asc' },
    select: propertySelect,
  });
}

export async function getPropertyById(id: string): Promise<PropertyItem | null> {
  return await getDb().property.findUnique({
    where: { id },
    select: propertySelect,
  });
}

export async function createProperty(input: {
  name: string;
  address?: string | null;
  companyId?: string | null;
}): Promise<PropertyItem> {
  return await getDb().property.create({
    data: {
      name: input.name.trim(),
      address: input.address?.trim() || null,
      companyId: input.companyId || null,
    },
    select: propertySelect,
  });
}

export async function updateProperty(
  id: string,
  input: { name: string; address?: string | null; companyId?: string | null },
): Promise<PropertyItem> {
  return await getDb().property.update({
    where: { id },
    data: {
      name: input.name.trim(),
      address: input.address?.trim() || null,
      companyId: input.companyId || null,
    },
    select: propertySelect,
  });
}

export async function deleteProperty(id: string): Promise<void> {
  await getDb().property.delete({ where: { id } });
}
