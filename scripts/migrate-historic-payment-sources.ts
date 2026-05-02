/**
 * Migration historique PaymentSource.
 *
 * Usage:
 *   DATABASE_URL=<url> npx tsx scripts/migrate-historic-payment-sources.ts
 *   DATABASE_URL=<url> npx tsx scripts/migrate-historic-payment-sources.ts --auto-match
 *   DATABASE_URL=<url> npx tsx scripts/migrate-historic-payment-sources.ts --apply
 *
 * Modes:
 *   - Dry-run scan (default): lit les transactions existantes sans source, groupe les signaux.
 *   - --auto-match: calcule une proposition de mapping sans écrire en DB.
 *   - --apply: applique uniquement les matches confiants, idempotent et sans toucher aux transactions déjà taggées.
 *
 * Important:
 *   - Le script ne crée pas les sources. Lancer `prisma db seed` avant si nécessaire.
 *   - Les sources attendues sont:
 *     Visa OREA, Visa 9522-6536 QC INC., Visa LeVi Capital, Mastercard perso Olivier.
 *   - Les transactions ambiguës restent non modifiées et sont listées dans le rapport.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SOURCE_NAMES = {
  orea: 'Visa OREA',
  qc9522: 'Visa 9522-6536 QC INC.',
  levi: 'Visa LeVi Capital',
  personal: 'Mastercard perso Olivier',
} as const;

type SourceKey = keyof typeof SOURCE_NAMES;
type Mode = 'scan' | 'auto-match' | 'apply';

type Candidate = {
  transactionId: string;
  sourceKey: SourceKey;
  confidence: 'high' | 'medium';
  reasons: string[];
};

type TransactionForMigration = {
  id: string;
  paymentMethod: string;
  merchantName: string;
  justification: string | null;
  attachmentUrl: string | null;
  paymentSourceId: string | null;
  company: { name: string } | null;
  property: { name: string } | null;
  category: { name: string } | null;
};

function getMode(): Mode {
  if (process.argv.includes('--apply')) return 'apply';
  if (process.argv.includes('--auto-match')) return 'auto-match';
  return 'scan';
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function haystack(transaction: TransactionForMigration): string {
  return normalize(
    [
      transaction.merchantName,
      transaction.justification,
      transaction.attachmentUrl,
      transaction.company?.name,
      transaction.property?.name,
      transaction.category?.name,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function pushCandidate(
  candidates: Candidate[],
  transactionId: string,
  sourceKey: SourceKey,
  confidence: Candidate['confidence'],
  reason: string,
) {
  candidates.push({ transactionId, sourceKey, confidence, reasons: [reason] });
}

function detectSource(transaction: TransactionForMigration): Candidate | null {
  if (transaction.paymentSourceId) return null;

  const text = haystack(transaction);
  const candidates: Candidate[] = [];

  if (text.includes('0027')) pushCandidate(candidates, transaction.id, 'orea', 'high', 'lastDigits 0027');
  if (text.includes('0016')) pushCandidate(candidates, transaction.id, 'qc9522', 'high', 'lastDigits 0016');
  if (text.includes('5025')) pushCandidate(candidates, transaction.id, 'levi', 'high', 'lastDigits 5025');
  if (text.includes('0310')) pushCandidate(candidates, transaction.id, 'personal', 'high', 'lastDigits 0310');

  if (transaction.paymentMethod === 'credit_card') {
    const company = normalize(transaction.company?.name);
    const property = normalize(transaction.property?.name);
    if (company.includes('orea') || company.includes('oréa')) {
      pushCandidate(candidates, transaction.id, 'orea', 'medium', 'company ORÉA');
    }
    if (company.includes('9522') || property.includes('9522')) {
      pushCandidate(candidates, transaction.id, 'qc9522', 'medium', 'company/property 9522');
    }
    if (company.includes('levi capital')) {
      pushCandidate(candidates, transaction.id, 'levi', 'medium', 'company LeVi Capital');
    }
    if (company.includes('perso') || text.includes('oli perso') || text.includes('olivier perso') || text.includes('mastercard')) {
      pushCandidate(candidates, transaction.id, 'personal', 'medium', 'personal signal');
    }
  }

  if (candidates.length === 0) return null;

  const grouped = new Map<SourceKey, Candidate>();
  for (const candidate of candidates) {
    const existing = grouped.get(candidate.sourceKey);
    if (!existing) {
      grouped.set(candidate.sourceKey, candidate);
      continue;
    }
    existing.reasons.push(...candidate.reasons);
    if (candidate.confidence === 'high') existing.confidence = 'high';
  }

  const unique = [...grouped.values()];
  const high = unique.filter((candidate) => candidate.confidence === 'high');
  if (high.length === 1) return high[0];
  if (high.length > 1) return null;
  return unique.length === 1 ? unique[0] : null;
}

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

async function main() {
  const mode = getMode();
  const sources = await prisma.paymentSource.findMany({
    where: { name: { in: Object.values(SOURCE_NAMES) } },
    select: { id: true, name: true, isPersonal: true, ownerCompanyId: true },
  });
  const sourceByName = new Map(sources.map((source) => [source.name, source]));
  const missingSources = Object.values(SOURCE_NAMES).filter((name) => !sourceByName.has(name));

  const transactions = await prisma.transaction.findMany({
    where: { paymentSourceId: null },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      paymentMethod: true,
      merchantName: true,
      justification: true,
      attachmentUrl: true,
      paymentSourceId: true,
      company: { select: { name: true } },
      property: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const paymentMethods: Record<string, number> = {};
  const companyCounts: Record<string, number> = {};
  const candidates: Candidate[] = [];
  const unmatched: TransactionForMigration[] = [];

  for (const transaction of transactions) {
    increment(paymentMethods, transaction.paymentMethod);
    increment(companyCounts, transaction.company?.name ?? '(no company)');
    const candidate = detectSource(transaction);
    if (candidate) {
      candidates.push(candidate);
    } else {
      unmatched.push(transaction);
    }
  }

  const candidateCounts: Record<string, number> = {};
  for (const candidate of candidates) {
    increment(candidateCounts, SOURCE_NAMES[candidate.sourceKey]);
  }

  const report = {
    mode,
    missing_sources: missingSources,
    transactions_without_source: transactions.length,
    payment_methods: paymentMethods,
    top_companies: Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count })),
    proposed_matches: candidateCounts,
    unmatched_count: unmatched.length,
    unmatched_sample: unmatched.slice(0, 20).map((transaction) => ({
      id: transaction.id,
      paymentMethod: transaction.paymentMethod,
      merchantName: transaction.merchantName,
      company: transaction.company?.name ?? null,
      property: transaction.property?.name ?? null,
      category: transaction.category?.name ?? null,
      attachmentUrl: transaction.attachmentUrl ?? null,
    })),
    sample_matches: candidates.slice(0, 20).map((candidate) => ({
      transactionId: candidate.transactionId,
      source: SOURCE_NAMES[candidate.sourceKey],
      confidence: candidate.confidence,
      reasons: candidate.reasons,
    })),
  };

  console.log(JSON.stringify(report, null, 2));

  if (mode !== 'apply') return;
  if (missingSources.length > 0) {
    throw new Error(`Sources manquantes. Lancez prisma db seed avant --apply: ${missingSources.join(', ')}`);
  }

  let updated = 0;
  for (const candidate of candidates) {
    const source = sourceByName.get(SOURCE_NAMES[candidate.sourceKey]);
    if (!source) continue;
    await prisma.transaction.update({
      where: { id: candidate.transactionId },
      data: {
        paymentSourceId: source.id,
        isAdvance: source.isPersonal,
        companyId: source.isPersonal ? undefined : source.ownerCompanyId ?? undefined,
      },
    });
    updated += 1;
  }

  console.log(JSON.stringify({ applied: updated }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
