import { Decimal } from '@prisma/client/runtime/library';
import { getDb } from './db';
import { OwnershipValidationError, validateOwnerships, type CoOwnerInput, type CoOwnerListItem } from './payment-source-owners';

export { OwnershipValidationError, validateOwnerships, type CoOwnerInput, type CoOwnerListItem };

export async function setPropertyOwners(propertyId: string, owners: CoOwnerInput[]): Promise<void> {
  validateOwnerships(owners);

  await getDb().$transaction(async (tx) => {
    await tx.propertyOwnership.deleteMany({ where: { propertyId } });

    if (owners.length === 0) return;

    await tx.propertyOwnership.createMany({
      data: owners.map((owner) => ({
        propertyId,
        companyId: owner.companyId,
        percent: new Decimal(owner.percent.toFixed(2)),
      })),
    });

    const principalOwner = [...owners].sort((a, b) => b.percent - a.percent)[0];
    await tx.property.update({
      where: { id: propertyId },
      data: { companyId: principalOwner.companyId },
    });
  });
}

export async function listPropertyOwners(propertyId: string): Promise<CoOwnerListItem[]> {
  const rows = await getDb().propertyOwnership.findMany({
    where: { propertyId },
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
