import { createHash } from 'node:crypto';
import { Decimal } from '@prisma/client/runtime/library';

export type DedupInput = {
  date: Date | string;
  amountTotal: Decimal | number | string;
  description: string;
  paymentSourceId: string;
};

function normalizeDate(value: Date | string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Invalid transaction date.');
    return value.toISOString().slice(0, 10);
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid transaction date.');
  return date.toISOString().slice(0, 10);
}

function amountToCents(value: DedupInput['amountTotal']): number {
  const amount = value instanceof Decimal ? value.toNumber() : Number(value);
  if (!Number.isFinite(amount)) throw new Error('Invalid transaction amountTotal.');
  return Math.round(amount * 100);
}

export function normalizeDescription(desc: string): string {
  return desc
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .trim();
}

export function computeDedupHash(input: DedupInput): string {
  const normalDesc = normalizeDescription(input.description ?? '');
  if (!normalDesc) throw new Error('Transaction description is required for dedup hash.');

  const srcId = input.paymentSourceId?.trim();
  if (!srcId) throw new Error('paymentSourceId is required for dedup hash.');

  const dateStr = normalizeDate(input.date);
  const cents = amountToCents(input.amountTotal);
  const payload = `${dateStr}|${cents}|${normalDesc}|${srcId}`;

  return createHash('sha256').update(payload).digest('hex');
}
