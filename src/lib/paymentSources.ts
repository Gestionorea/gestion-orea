import type { PaymentSourceKind } from '@prisma/client';
import { getDb } from '@/lib/db';

export const PAYMENT_SOURCE_KINDS: PaymentSourceKind[] = ['card', 'bank_account', 'cash', 'other'];

export type PaymentSourceItem = {
  id: string;
  name: string;
  kind: PaymentSourceKind;
  lastDigits: string | null;
  isPersonal: boolean;
  ownerCompanyId: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerCompany: { id: string; name: string } | null;
};

const paymentSourceSelect = {
  id: true,
  name: true,
  kind: true,
  lastDigits: true,
  isPersonal: true,
  ownerCompanyId: true,
  archived: true,
  createdAt: true,
  updatedAt: true,
  ownerCompany: { select: { id: true, name: true } },
} as const;

export function isPaymentSourceKind(value: string): value is PaymentSourceKind {
  return PAYMENT_SOURCE_KINDS.includes(value as PaymentSourceKind);
}

export async function listPaymentSources(options: { archived?: boolean } = {}): Promise<PaymentSourceItem[]> {
  const archived = options.archived ?? false;
  return await getDb().paymentSource.findMany({
    where: { archived },
    orderBy: [{ isPersonal: 'asc' }, { name: 'asc' }],
    select: paymentSourceSelect,
  });
}

export async function getPaymentSourceById(id: string): Promise<PaymentSourceItem | null> {
  return await getDb().paymentSource.findUnique({
    where: { id },
    select: paymentSourceSelect,
  });
}

export async function getActivePaymentSourceById(id: string): Promise<PaymentSourceItem | null> {
  return await getDb().paymentSource.findFirst({
    where: { id, archived: false },
    select: paymentSourceSelect,
  });
}

export async function paymentSourceNameExists(name: string, excludeId?: string): Promise<boolean> {
  return Boolean(
    await getDb().paymentSource.findFirst({
      where: {
        name: name.trim(),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    }),
  );
}

export async function createPaymentSource(input: {
  name: string;
  kind: PaymentSourceKind;
  lastDigits: string | null;
  isPersonal: boolean;
  ownerCompanyId: string | null;
}): Promise<PaymentSourceItem> {
  return await getDb().paymentSource.create({
    data: {
      name: input.name.trim(),
      kind: input.kind,
      lastDigits: input.lastDigits,
      isPersonal: input.isPersonal,
      ownerCompanyId: input.isPersonal ? null : input.ownerCompanyId,
    },
    select: paymentSourceSelect,
  });
}

export async function updatePaymentSource(
  id: string,
  input: {
    name: string;
    kind: PaymentSourceKind;
    lastDigits: string | null;
    isPersonal: boolean;
    ownerCompanyId: string | null;
  },
): Promise<PaymentSourceItem> {
  return await getDb().paymentSource.update({
    where: { id },
    data: {
      name: input.name.trim(),
      kind: input.kind,
      lastDigits: input.lastDigits,
      isPersonal: input.isPersonal,
      ownerCompanyId: input.isPersonal ? null : input.ownerCompanyId,
    },
    select: paymentSourceSelect,
  });
}

export async function archivePaymentSource(id: string): Promise<void> {
  await getDb().paymentSource.update({
    where: { id },
    data: { archived: true },
  });
}
