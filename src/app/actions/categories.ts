'use server';

import { redirect } from 'next/navigation';
import {
  createCategory,
  deleteCategory,
  isCategoryType,
  updateCategory,
} from '@/lib/categories';
import { requireOwner } from '@/lib/permissions';

export type CategoryActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function parseInput(formData: FormData) {
  const type = getString(formData, 'type');
  return {
    name: getString(formData, 'name'),
    type: isCategoryType(type) ? type : null,
    description: getString(formData, 'description') || null,
  };
}

function validate(input: ReturnType<typeof parseInput>): CategoryActionState | null {
  const fieldErrors: Record<string, string> = {};
  if (!input.name) fieldErrors.name = 'required';
  if (!input.type) fieldErrors.type = 'invalid';
  return Object.keys(fieldErrors).length > 0 ? { success: false, fieldErrors } : null;
}

export async function createCategoryAction(
  prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  void prev;
  await requireOwner();
  const input = parseInput(formData);
  const error = validate(input);
  if (error || !input.type) return error ?? { success: false, fieldErrors: { type: 'invalid' } };
  await createCategory({ ...input, type: input.type });
  redirect('/fr/perso/admin/categories');
}

export async function updateCategoryAction(
  prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  void prev;
  await requireOwner();
  const input = parseInput(formData);
  const error = validate(input);
  if (error || !input.type) return error ?? { success: false, fieldErrors: { type: 'invalid' } };
  await updateCategory(getString(formData, 'id'), { ...input, type: input.type });
  redirect('/fr/perso/admin/categories');
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireOwner();
  await deleteCategory(getString(formData, 'id'));
  redirect('/fr/perso/admin/categories');
}
