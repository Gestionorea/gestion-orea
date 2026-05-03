import { Decimal } from '@prisma/client/runtime/library';
import { getDb } from './db';

export type CoOwnerInput = {
  companyId: string;
  percent: number;
};

export type CoOwnerListItem = {
  id: string;
  companyId: string;
  companyName: string;
  percent: number;
};

export class OwnershipValidationError extends Error {}

export function validateOwnerships(owners: CoOwnerInput[]): void {
  if (owners.length === 0) return;

  const seen = new Set<string>();
  let total = 0;

  for (const owner of owners) {
    if (!owner.companyId) {
      throw new OwnershipValidationError('Compagnie requise');
    }

    if (seen.has(owner.companyId)) {
      throw new OwnershipValidationError(`Compagnie ${owner.companyId} listee plusieurs fois`);
    }
    seen.add(owner.companyId);

    if (!Number.isFinite(owner.percent) || owner.percent <= 0 || owner.percent > 100) {
      throw new OwnershipValidationError(`Percent invalide: ${owner.percent} (doit etre entre 0.01 et 100)`);
    }

    total += owner.percent;
  }

  if (Math.abs(total - 100) > 0.01) {
    throw new OwnershipValidationError(`Somme percent = ${total.toFixed(2)}, doit etre 100.00`);
  }
}

export async function setPaymentSourceOwners(paymentSourceId: string, owners: CoOwnerInput[]): Promise<void> {
  validateOwnerships(owners);

  await getDb().$transaction(async (tx) => {
    await tx.paymentSourceOwnership.deleteMany({ where: { paymentSourceId } });

    if (owners.length === 0) return;

    await tx.paymentSourceOwnership.createMany({
      data: owners.map((owner) => ({
        paymentSourceId,
        companyId: owner.companyId,
        percent: new Decimal(owner.percent.toFixed(2)),
      })),
    });

    const principalOwner = [...owners].sort((a, b) => b.percent - a.percent)[0];
    await tx.paymentSource.update({
      where: { id: paymentSourceId },
      data: { ownerCompanyId: principalOwner.companyId },
    });
  });
}

export async function listPaymentSourceOwners(paymentSourceId: string): Promise<CoOwnerListItem[]> {
  const rows = await getDb().paymentSourceOwnership.findMany({
    where: { paymentSourceId },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { percent: 'desc' },
  });

  return rows.map((row) => ({
    id: row.id,
    companyId: row.companyId,
    companyName: row.company.name,
    percent: Number(row.percent),
  }));
}
