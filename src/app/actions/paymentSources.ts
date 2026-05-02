'use server';

import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import {
  archivePaymentSource,
  createPaymentSource,
  isPaymentSourceKind,
  paymentSourceNameExists,
  updatePaymentSource,
} from '@/lib/paymentSources';
import { requireOwner } from '@/lib/permissions';

export type PaymentSourceActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function getOptional(formData: FormData, key: string): string | null {
  return getString(formData, key) || null;
}

async function companyExists(id: string | null): Promise<boolean> {
  if (!id) return false;
  return Boolean(await getDb().company.findUnique({ where: { id }, select: { id: true } }));
}

async function parsePaymentSource(
  formData: FormData,
  id?: string,
): Promise<{
  input?: {
    name: string;
    kind: 'card' | 'bank_account' | 'cash' | 'other';
    lastDigits: string | null;
    isPersonal: boolean;
    ownerCompanyId: string | null;
  };
  fieldErrors?: Record<string, string>;
}> {
  const name = getString(formData, 'name');
  const kind = getString(formData, 'kind');
  const lastDigits = getOptional(formData, 'lastDigits');
  const isPersonal = getString(formData, 'isPersonal') === 'on';
  const ownerCompanyId = getOptional(formData, 'ownerCompanyId');
  const fieldErrors: Record<string, string> = {};

  if (!name || name.length > 80) fieldErrors.name = 'required';
  if (await paymentSourceNameExists(name, id)) fieldErrors.name = 'usernameTaken';
  if (!isPaymentSourceKind(kind)) fieldErrors.kind = 'invalid';
  if (lastDigits && !/^\d{4}$/.test(lastDigits)) fieldErrors.lastDigits = 'invalidLastDigits';
  if (isPersonal && ownerCompanyId) fieldErrors.ownerCompanyId = 'personalOwnerForbidden';
  if (!isPersonal && !ownerCompanyId) fieldErrors.ownerCompanyId = 'requireOwner';
  if (!isPersonal && ownerCompanyId && !(await companyExists(ownerCompanyId))) {
    fieldErrors.ownerCompanyId = 'notFound';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  return {
    input: {
      name,
      kind: kind as 'card' | 'bank_account' | 'cash' | 'other',
      lastDigits,
      isPersonal,
      ownerCompanyId: isPersonal ? null : ownerCompanyId,
    },
  };
}

export async function createPaymentSourceAction(
  prev: PaymentSourceActionState,
  formData: FormData,
): Promise<PaymentSourceActionState> {
  void prev;
  await requireOwner();
  const parsed = await parsePaymentSource(formData);
  if (!parsed.input) return { success: false, fieldErrors: parsed.fieldErrors };
  await createPaymentSource(parsed.input);
  redirect('/fr/perso/admin/sources-paiement');
}

export async function updatePaymentSourceAction(
  prev: PaymentSourceActionState,
  formData: FormData,
): Promise<PaymentSourceActionState> {
  void prev;
  await requireOwner();
  const id = getString(formData, 'id');
  const parsed = await parsePaymentSource(formData, id);
  if (!parsed.input) return { success: false, fieldErrors: parsed.fieldErrors };
  await updatePaymentSource(id, parsed.input);
  redirect('/fr/perso/admin/sources-paiement');
}

export async function archivePaymentSourceAction(formData: FormData): Promise<void> {
  await requireOwner();
  await archivePaymentSource(getString(formData, 'id'));
  redirect('/fr/perso/admin/sources-paiement');
}
