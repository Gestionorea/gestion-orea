'use server';

import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { requireMutator, requireReconciler } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import {
  createTransaction,
  deleteTransaction,
  isBeneficiary,
  isPaymentMethod,
  isTaxRegime,
  isTransactionType,
  setTransactionReconciled,
  updateTransaction,
} from '@/lib/transactions';
import { getActivePaymentSourceById } from '@/lib/paymentSources';

export type TransactionActionState = {
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

function isDecimal(value: string): boolean {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return false;
  return new Prisma.Decimal(value).gte(0);
}

async function exists(model: 'property' | 'company' | 'category', id: string | null) {
  if (!id) return true;
  if (model === 'property') return Boolean(await getDb().property.findUnique({ where: { id } }));
  if (model === 'company') return Boolean(await getDb().company.findUnique({ where: { id } }));
  return Boolean(await getDb().category.findUnique({ where: { id } }));
}

async function parseAndValidate(formData: FormData): Promise<{
  input?: {
    type: 'income' | 'expense';
    date: Date;
    merchantName: string;
    amountBeforeTax: string;
    gst: string | null;
    qst: string | null;
    amountTotal: string;
    taxRegime: 'taxable_qc' | 'exempt' | 'manual';
    paymentMethod: 'interac' | 'credit_card' | 'debit_card' | 'cash' | 'wire' | 'check' | 'preauthorized_debit' | 'other';
    paymentSourceId: string | null;
    isAdvance: boolean;
    propertyId: string | null;
    companyId: string | null;
    beneficiary: 'self' | 'company' | 'property';
    invoiceNumber: string | null;
    justification: string | null;
    attachmentUrl: string | null;
    categoryId: string | null;
  };
  fieldErrors?: Record<string, string>;
}> {
  const typeRaw = getString(formData, 'type');
  const taxRegimeRaw = getString(formData, 'taxRegime');
  const paymentMethodRaw = getString(formData, 'paymentMethod');
  const beneficiaryRaw = getString(formData, 'beneficiary');
  const dateRaw = getString(formData, 'date');
  const merchantName = getString(formData, 'merchantName');
  let amountBeforeTax = getString(formData, 'amountBeforeTax');
  let gst = getOptional(formData, 'gst');
  let qst = getOptional(formData, 'qst');
  const amountTotal = getString(formData, 'amountTotal');
  const propertyId = getOptional(formData, 'propertyId');
  const companyId = getOptional(formData, 'companyId');
  const categoryId = getOptional(formData, 'categoryId');
  const paymentSourceId = getOptional(formData, 'paymentSourceId');
  const attachmentUrl = getOptional(formData, 'attachmentUrl');
  const fieldErrors: Record<string, string> = {};
  const date = new Date(`${dateRaw}T00:00:00`);
  const paymentSource = paymentSourceId ? await getActivePaymentSourceById(paymentSourceId) : null;

  if (!isTransactionType(typeRaw)) fieldErrors.type = 'invalid';
  if (!isTaxRegime(taxRegimeRaw)) fieldErrors.taxRegime = 'invalid';
  if (!isPaymentMethod(paymentMethodRaw)) fieldErrors.paymentMethod = 'invalid';
  if (!isBeneficiary(beneficiaryRaw)) fieldErrors.beneficiary = 'invalid';
  if (!dateRaw || Number.isNaN(date.getTime())) fieldErrors.date = 'invalid';
  if (!merchantName) fieldErrors.merchantName = 'required';
  if (!isDecimal(amountTotal)) fieldErrors.amountTotal = 'invalid_amount';
  if (taxRegimeRaw === 'exempt' && isDecimal(amountTotal)) {
    amountBeforeTax = amountTotal;
    gst = '0.00';
    qst = '0.00';
  }
  if (taxRegimeRaw !== 'exempt') {
    if (!isDecimal(amountBeforeTax)) fieldErrors.amountBeforeTax = 'invalid_amount';
    if (gst && !isDecimal(gst)) fieldErrors.gst = 'invalid_amount';
    if (qst && !isDecimal(qst)) fieldErrors.qst = 'invalid_amount';
  }
  if (attachmentUrl && !/^https?:\/\/\S+\.\S+/.test(attachmentUrl)) {
    fieldErrors.attachmentUrl = 'invalid_url';
  }

  if (
    taxRegimeRaw === 'taxable_qc' &&
    isDecimal(amountBeforeTax) &&
    (!gst || isDecimal(gst)) &&
    (!qst || isDecimal(qst)) &&
    isDecimal(amountTotal)
  ) {
    const expected = new Prisma.Decimal(amountBeforeTax).plus(gst || 0).plus(qst || 0);
    const actual = new Prisma.Decimal(amountTotal);
    if (actual.minus(expected).abs().gt(0.01)) {
      fieldErrors.taxRegime = 'taxesInconsistent';
    }
  }

  if (!(await exists('property', propertyId))) fieldErrors.propertyId = 'not_found';
  if (!(await exists('company', companyId))) fieldErrors.companyId = 'not_found';
  if (!(await exists('category', categoryId))) fieldErrors.categoryId = 'not_found';
  if (paymentSourceId && !paymentSource) fieldErrors.paymentSourceId = 'invalid_source';

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const finalCompanyId = companyId || paymentSource?.ownerCompanyId || null;

  return {
    input: {
      type: typeRaw as 'income' | 'expense',
      date,
      merchantName,
      amountBeforeTax,
      gst,
      qst,
      amountTotal,
      taxRegime: taxRegimeRaw as 'taxable_qc' | 'exempt' | 'manual',
      paymentMethod: paymentMethodRaw as 'interac' | 'credit_card' | 'debit_card' | 'cash' | 'wire' | 'check' | 'preauthorized_debit' | 'other',
      paymentSourceId,
      isAdvance: paymentSource?.isPersonal ?? false,
      propertyId,
      companyId: finalCompanyId,
      beneficiary: beneficiaryRaw as 'self' | 'company' | 'property',
      invoiceNumber: getOptional(formData, 'invoiceNumber'),
      justification: getOptional(formData, 'justification'),
      attachmentUrl,
      categoryId,
    },
  };
}

export async function createTransactionAction(
  prev: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  void prev;
  const session = await requireMutator();
  const parsed = await parseAndValidate(formData);
  if (!parsed.input) return { success: false, fieldErrors: parsed.fieldErrors };
  await createTransaction({ ...parsed.input, createdById: session.userId });
  redirect('/fr/perso/comptabilite');
}

export async function updateTransactionAction(
  prev: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  void prev;
  await requireMutator();
  const parsed = await parseAndValidate(formData);
  if (!parsed.input) return { success: false, fieldErrors: parsed.fieldErrors };
  await updateTransaction(getString(formData, 'id'), parsed.input);
  redirect('/fr/perso/comptabilite');
}

export async function deleteTransactionAction(formData: FormData): Promise<void> {
  await requireMutator();
  await deleteTransaction(getString(formData, 'id'));
  redirect('/fr/perso/comptabilite');
}

export async function toggleReconciledAction(formData: FormData): Promise<void> {
  const session = await requireReconciler();
  const id = getString(formData, 'id');
  const reconciled = getString(formData, 'reconciled') === 'true';
  await setTransactionReconciled(id, reconciled, session.userId);
  revalidatePath('/fr/perso/comptabilite');
}
