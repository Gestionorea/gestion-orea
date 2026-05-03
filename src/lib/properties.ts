import { getDb } from '@/lib/db';
import type { CoOwnerListItem } from './payment-source-owners';

export type PropertyItem = {
  id: string;
  name: string;
  address: string | null;
  companyId: string | null;
  company: { id: string; name: string } | null;
  coOwners?: CoOwnerListItem[];
  createdAt: Date;
  updatedAt: Date;
};

const propertySelect = {
  id: true,
  name: true,
  address: true,
  companyId: true,
  company: { select: { id: true, name: true } },
  coOwners: {
    select: {
      id: true,
      companyId: true,
      percent: true,
      company: { select: { id: true, name: true } },
    },
    orderBy: { percent: 'desc' },
  },
  createdAt: true,
  updatedAt: true,
} as const;

function mapProperty<T extends {
  coOwners: Array<{
    id: string;
    companyId: string;
    percent: { toNumber?: () => number } | number;
    company: { name: string };
  }>;
}>(property: T): Omit<T, 'coOwners'> & { coOwners: CoOwnerListItem[] } {
  return {
    ...property,
    coOwners: property.coOwners.map((owner) => ({
      id: owner.id,
      companyId: owner.companyId,
      companyName: owner.company.name,
      percent: typeof owner.percent === 'number' ? owner.percent : owner.percent.toNumber?.() ?? Number(owner.percent),
    })),
  };
}

export async function listProperties(): Promise<PropertyItem[]> {
  const rows = await getDb().property.findMany({
    orderBy: { name: 'asc' },
    select: propertySelect,
  });
  return rows.map(mapProperty);
}

export async function getPropertyById(id: string): Promise<PropertyItem | null> {
  const property = await getDb().property.findUnique({
    where: { id },
    select: propertySelect,
  });
  return property ? mapProperty(property) : null;
}

export async function createProperty(input: {
  name: string;
  address?: string | null;
  companyId?: string | null;
}): Promise<PropertyItem> {
  const property = await getDb().property.create({
    data: {
      name: input.name.trim(),
      address: input.address?.trim() || null,
      companyId: input.companyId || null,
    },
    select: propertySelect,
  });
  return mapProperty(property);
}

export async function updateProperty(
  id: string,
  input: { name: string; address?: string | null; companyId?: string | null },
): Promise<PropertyItem> {
  const property = await getDb().property.update({
    where: { id },
    data: {
      name: input.name.trim(),
      address: input.address?.trim() || null,
      companyId: input.companyId || null,
    },
    select: propertySelect,
  });
  return mapProperty(property);
}

export async function deleteProperty(id: string): Promise<void> {
  await getDb().property.delete({ where: { id } });
}
