import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const WIPE_TRANSACTION_TIMEOUT_MS = 10 * 60 * 1000;
const HISTORIC_MONDAY_WHERE = { taxRegime: 'manual' } as const;

type Mode = 'dry-run' | 'apply';

function getMode(): Mode {
  return process.argv.includes('--apply') ? 'apply' : 'dry-run';
}

async function buildSummary(mode: Mode) {
  const [historicMondayCount, sparedCount, linkedAdvanceCount, reconciledCount, samples] = await Promise.all([
    prisma.transaction.count({ where: HISTORIC_MONDAY_WHERE }),
    prisma.transaction.count({ where: { taxRegime: { not: 'manual' } } }),
    prisma.transaction.count({
      where: {
        taxRegime: 'manual',
        OR: [{ isAdvance: true }, { reimbursementTransactionId: { not: null } }],
      },
    }),
    prisma.transaction.count({
      where: {
        taxRegime: 'manual',
        reconciledAt: { not: null },
      },
    }),
    prisma.transaction.findMany({
      where: HISTORIC_MONDAY_WHERE,
      orderBy: { date: 'asc' },
      take: 5,
      select: {
        date: true,
        merchantName: true,
        amountTotal: true,
        taxRegime: true,
      },
    }),
  ]);

  return {
    mode,
    historic_monday_transactions: historicMondayCount,
    spared_transactions_tax_regime_not_manual: sparedCount,
    historic_monday_with_advance_links: linkedAdvanceCount,
    historic_monday_reconciled: reconciledCount,
    sample_oldest_transactions: samples.map((transaction) => ({
      date: transaction.date.toISOString().slice(0, 10),
      merchantName: transaction.merchantName,
      amountTotal: transaction.amountTotal.toFixed(2),
      taxRegime: transaction.taxRegime,
    })),
  };
}

async function confirmApply(count: number): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.error('ABORT: le mode --apply exige un terminal interactif.');
    return false;
  }

  const expected = `WIPE ${count}`;
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`Tape exactement ${expected} pour confirmer: `);
    if (answer !== expected) {
      console.error(`ABORT: confirmation invalide. Saisie attendue: ${expected}`);
      return false;
    }
    return true;
  } finally {
    rl.close();
  }
}

async function applyWipe(count: number) {
  const confirmed = await confirmApply(count);
  if (!confirmed) {
    process.exitCode = 1;
    return;
  }

  const result = await prisma.$transaction(
    async (tx) => tx.transaction.deleteMany({ where: HISTORIC_MONDAY_WHERE }),
    { timeout: WIPE_TRANSACTION_TIMEOUT_MS },
  );
  const totalTransactions = await prisma.transaction.count();

  console.log(`OK: ${result.count} transactions supprimees.`);
  console.log(JSON.stringify({ deleted: result.count, total_transactions_after_delete: totalTransactions }, null, 2));
}

async function main() {
  const mode = getMode();
  const summary = await buildSummary(mode);

  console.log(mode === 'apply' ? 'MODE: APPLY' : 'MODE: DRY-RUN');
  console.log(JSON.stringify(summary, null, 2));

  if (mode === 'apply') {
    await applyWipe(summary.historic_monday_transactions);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
