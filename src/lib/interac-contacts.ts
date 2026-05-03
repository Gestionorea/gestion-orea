import { getDb } from './db';

export type InteracContactSuggestion = {
  name: string;
  defaultCategoryId: string | null;
  occurrences: number;
};

const INTERAC_RECIPIENT_PATTERN = /virement\s+interac\s+(?:a|à)\s+\/([^/]+?)\s*\//i;

export function extractInteracName(description: string): string | null {
  const match = description.match(INTERAC_RECIPIENT_PATTERN);
  if (!match?.[1]) return null;

  const name = match[1].replace(/\s+/g, ' ').trim();
  return name.length > 0 ? name : null;
}

export async function findInteracContact(name: string): Promise<InteracContactSuggestion | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const contact = await getDb().interacContact.findUnique({
    where: { name: trimmedName },
    select: {
      name: true,
      defaultCategoryId: true,
      occurrences: true,
    },
  });

  return contact;
}

export async function upsertInteracContact(name: string, categoryId: string | null): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const now = new Date();
  await getDb().interacContact.upsert({
    where: { name: trimmedName },
    create: {
      name: trimmedName,
      defaultCategoryId: categoryId,
      occurrences: 1,
      lastSeenAt: now,
    },
    update: {
      occurrences: { increment: 1 },
      lastSeenAt: now,
      ...(categoryId ? { defaultCategoryId: categoryId } : {}),
    },
  });
}
