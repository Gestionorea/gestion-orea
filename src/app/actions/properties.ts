'use server';

import { redirect } from 'next/navigation';
import { createProperty, deleteProperty, updateProperty } from '@/lib/properties';
import { requireOwner } from '@/lib/permissions';

export type PropertyActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function parseInput(formData: FormData) {
  return {
    name: getString(formData, 'name'),
    address: getString(formData, 'address') || null,
    companyId: getString(formData, 'companyId') || null,
  };
}

function validateName(name: string): PropertyActionState | null {
  if (!name) return { success: false, fieldErrors: { name: 'required' } };
  return null;
}

export async function createPropertyAction(
  prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  void prev;
  await requireOwner();
  const input = parseInput(formData);
  const error = validateName(input.name);
  if (error) return error;
  await createProperty(input);
  redirect('/fr/perso/admin/immeubles');
}

export async function updatePropertyAction(
  prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  void prev;
  await requireOwner();
  const input = parseInput(formData);
  const error = validateName(input.name);
  if (error) return error;
  await updateProperty(getString(formData, 'id'), input);
  redirect('/fr/perso/admin/immeubles');
}

export async function deletePropertyAction(formData: FormData): Promise<void> {
  await requireOwner();
  await deleteProperty(getString(formData, 'id'));
  redirect('/fr/perso/admin/immeubles');
}
