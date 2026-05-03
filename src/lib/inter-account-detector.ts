import { Prisma } from '@prisma/client';
import { normalizeDescription } from './dedup-hash';
import { getDb } from './db';

export type DetectionInput = {
  newTransactionId: string;
  paymentSourceId: string;
  date: Date;
  amountTotal: number;
  description: string;
  type: 'income' | 'expense';
};

export type DetectionMatch = {
  matchedTransactionId: string;
  matchedPaymentSourceId: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
};

type DetectorDb = {
  paymentSource: {
    findUnique: (args: {
      where: { id: string };
      select: {
        ownerCompanyId: true;
        coOwners: { select: { companyId: true } };
      };
    }) => Promise<{ ownerCompanyId: string | null; coOwners?: Array<{ companyId: string }> } | null>;
    findMany: (args: {
      where: {
        archived: false;
        ownerCompanyId?: string | null;
        OR?: Array<
          | { ownerCompanyId: { in: string[] } }
          | { coOwners: { some: { companyId: { in: string[] } } } }
        >;
        kind?: 'card';
        id?: { not: string };
      };
      select: { id: true };
    }) => Promise<{ id: string }[]>;
  };
  transaction: {
    findMany: (args: {
      where: {
        id?: { not: string };
        paymentSourceId?: string | { in: string[] };
        type: 'income' | 'expense';
        date: { gte: Date; lte: Date };
        amountTotal: Prisma.Decimal;
        isAdvance?: false;
        reimbursementTransactionId?: null;
      };
      select: {
        id: true;
        paymentSourceId: true;
      };
    }) => Promise<{ id: string; paymentSourceId: string | null }[]>;
  };
};

function amountFromCents(cents: number): Prisma.Decimal {
  return new Prisma.Decimal((cents / 100).toFixed(2));
}

function dateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value: Date, days: number): Date {
  const date = dateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function isCardPayment(description: string): boolean {
  return /\b(visa|mc|mastercard)\b/i.test(description);
}

function isInteracTransfer(description: string): boolean {
  return /\bvirement\s+interac\b/i.test(description);
}

function isMobileDeposit(description: string): boolean {
  return /\bdepot\s+mobile\b/i.test(normalizeDescription(description));
}

async function ownerCompanyIdsForSource(db: DetectorDb, paymentSourceId: string): Promise<string[]> {
  const source = await db.paymentSource.findUnique({
    where: { id: paymentSourceId },
    select: {
      ownerCompanyId: true,
      coOwners: { select: { companyId: true } },
    },
  });

  if (!source) return [];
  const coOwnerIds = source.coOwners?.map((owner) => owner.companyId) ?? [];
  if (coOwnerIds.length > 0) return coOwnerIds;
  return source.ownerCompanyId ? [source.ownerCompanyId] : [];
}

async function findSourcesForOwner(
  db: DetectorDb,
  paymentSourceId: string,
  ownerCompanyIds: string[],
  kind?: 'card',
): Promise<string[]> {
  if (ownerCompanyIds.length === 0) return [];

  const sources = await db.paymentSource.findMany({
    where: {
      archived: false,
      id: { not: paymentSourceId },
      OR: [
        { ownerCompanyId: { in: ownerCompanyIds } },
        { coOwners: { some: { companyId: { in: ownerCompanyIds } } } },
      ],
      ...(kind ? { kind } : {}),
    },
    select: { id: true },
  });

  return sources.map((source) => source.id);
}

async function findUniqueTransactionMatch(
  db: DetectorDb,
  input: DetectionInput,
  paymentSourceIds: string[],
  type: 'income' | 'expense',
  dateWindowDays: number,
): Promise<{ id: string; paymentSourceId: string | null } | null> {
  if (paymentSourceIds.length === 0) return null;

  const matches = await db.transaction.findMany({
    where: {
      id: { not: input.newTransactionId },
      paymentSourceId: { in: paymentSourceIds },
      type,
      date: {
        gte: addDays(input.date, -dateWindowDays),
        lte: addDays(input.date, dateWindowDays + 1),
      },
      amountTotal: amountFromCents(input.amountTotal),
      isAdvance: false,
      reimbursementTransactionId: null,
    },
    select: {
      id: true,
      paymentSourceId: true,
    },
  });

  if (matches.length !== 1) return null;
  return matches[0];
}

export async function detectInterAccountTransfer(
  input: DetectionInput,
  db: DetectorDb = getDb(),
): Promise<DetectionMatch | null> {
  const normalizedDescription = normalizeDescription(input.description);
  const ownerCompanyIds = await ownerCompanyIdsForSource(db, input.paymentSourceId);

  if (input.type === 'expense') {
    if (isInteracTransfer(input.description)) return null;

    if (isCardPayment(input.description)) {
      const cardSourceIds = await findSourcesForOwner(db, input.paymentSourceId, ownerCompanyIds, 'card');
      const match = await findUniqueTransactionMatch(db, input, cardSourceIds, 'expense', 3);
      if (!match || !match.paymentSourceId) return null;

      return {
        matchedTransactionId: match.id,
        matchedPaymentSourceId: match.paymentSourceId,
        confidence: 'medium',
        reason: `Paiement carte interne detecté autour du ${input.date.toISOString().slice(0, 10)}`,
      };
    }
  }

  if (input.type === 'income' && isMobileDeposit(normalizedDescription)) {
    const otherSourceIds = await findSourcesForOwner(db, input.paymentSourceId, ownerCompanyIds);
    const match = await findUniqueTransactionMatch(db, input, otherSourceIds, 'expense', 0);
    if (!match || !match.paymentSourceId) return null;

    return {
      matchedTransactionId: match.id,
      matchedPaymentSourceId: match.paymentSourceId,
      confidence: 'medium',
      reason: `Depot mobile avec dépense identique le ${input.date.toISOString().slice(0, 10)}`,
    };
  }

  return null;
}
