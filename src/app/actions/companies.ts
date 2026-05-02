'use server';

import { redirect } from 'next/navigation';
import { createCompany, deleteCompany, updateCompany } from '@/lib/companies';
import { requireOwner } from '@/lib/permissions';

export type ReferenceActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function validateName(name: string): ReferenceActionState | null {
  if (!name) {
    return { success: false, fieldErrors: { name: 'required' } };
  }

  return null;
}

export async function createCompanyAction(
  prev: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  void prev;
  await requireOwner();
  const name = getString(formData, 'name');
  const error = validateName(name);
  if (error) return error;
  await createCompany(name);
  redirect('/fr/perso/admin/compagnies');
}

export async function updateCompanyAction(
  prev: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  void prev;
  await requireOwner();
  const id = getString(formData, 'id');
  const name = getString(formData, 'name');
  const error = validateName(name);
  if (error) return error;
  await updateCompany(id, name);
  redirect('/fr/perso/admin/compagnies');
}

export async function deleteCompanyAction(formData: FormData): Promise<void> {
  await requireOwner();
  await deleteCompany(getString(formData, 'id'));
  redirect('/fr/perso/admin/compagnies');
}
