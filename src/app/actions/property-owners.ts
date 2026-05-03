'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/permissions';
import { OwnershipValidationError, setPropertyOwners, type CoOwnerInput } from '@/lib/property-owners';

export type OwnershipActionResult = { ok: true } | { ok: false; error: string };

function parseOwners(value: FormDataEntryValue | null): CoOwnerInput[] | null {
  if (typeof value !== 'string') return null;
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) return null;

  return parsed.map((owner) => {
    if (
      typeof owner !== 'object' ||
      owner === null ||
      !('companyId' in owner) ||
      !('percent' in owner) ||
      typeof owner.companyId !== 'string'
    ) {
      throw new Error('Invalid owner');
    }

    return {
      companyId: owner.companyId,
      percent: Number(owner.percent),
    };
  });
}

export async function setPropertyOwnersAction(formData: FormData): Promise<OwnershipActionResult> {
  await requireOwner();

  const propertyId = formData.get('propertyId');
  if (typeof propertyId !== 'string' || !propertyId) {
    return { ok: false, error: 'propertyId requis' };
  }

  let owners: CoOwnerInput[] | null;
  try {
    owners = parseOwners(formData.get('owners'));
  } catch {
    return { ok: false, error: 'Format owners invalide' };
  }

  if (!owners) return { ok: false, error: 'owners requis' };

  try {
    await setPropertyOwners(propertyId, owners);
  } catch (error) {
    if (error instanceof OwnershipValidationError) return { ok: false, error: error.message };
    return { ok: false, error: 'Echec mise a jour' };
  }

  revalidatePath('/fr/perso/admin/immeubles');
  revalidatePath('/en/perso/admin/immeubles');
  revalidatePath('/fr/perso/comptabilite');
  revalidatePath('/en/perso/comptabilite');
  return { ok: true };
}
