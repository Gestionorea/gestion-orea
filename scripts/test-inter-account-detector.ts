import { detectInterAccountTransfer } from '../src/lib/inter-account-detector';

type Source = {
  id: string;
  ownerCompanyId: string | null;
  kind: 'card' | 'bank_account';
  archived: boolean;
};

type Tx = {
  id: string;
  paymentSourceId: string;
  type: 'income' | 'expense';
  date: Date;
  amountCents: number;
  isAdvance?: boolean;
  reimbursementTransactionId?: string | null;
};

function createDb(sources: Source[], transactions: Tx[]) {
  return {
    paymentSource: {
      async findUnique(args: { where: { id: string } }) {
        const source = sources.find((item) => item.id === args.where.id);
        return source ? { ownerCompanyId: source.ownerCompanyId } : null;
      },
      async findMany(args: {
        where: {
          archived: false;
          ownerCompanyId?: string | null;
          kind?: 'card';
          id?: { not: string };
        };
      }) {
        return sources
          .filter((source) => source.archived === args.where.archived)
          .filter((source) => source.ownerCompanyId === args.where.ownerCompanyId)
          .filter((source) => !args.where.kind || source.kind === args.where.kind)
          .filter((source) => !args.where.id || source.id !== args.where.id.not)
          .map((source) => ({ id: source.id }));
      },
    },
    transaction: {
      async findMany(args: {
        where: {
          id?: { not: string };
          paymentSourceId?: string | { in: string[] };
          type: 'income' | 'expense';
          date: { gte: Date; lte: Date };
          amountTotal: { toString: () => string };
          isAdvance?: false;
          reimbursementTransactionId?: null;
        };
        select?: unknown;
      }) {
        const expectedCents = Math.round(Number(args.where.amountTotal.toString()) * 100);
        const paymentSourceIds =
          typeof args.where.paymentSourceId === 'string'
            ? [args.where.paymentSourceId]
            : args.where.paymentSourceId?.in;

        return transactions
          .filter((transaction) => !args.where.id || transaction.id !== args.where.id.not)
          .filter((transaction) => !paymentSourceIds || paymentSourceIds.includes(transaction.paymentSourceId))
          .filter((transaction) => transaction.type === args.where.type)
          .filter((transaction) => transaction.date >= args.where.date.gte && transaction.date <= args.where.date.lte)
          .filter((transaction) => transaction.amountCents === expectedCents)
          .filter((transaction) => transaction.isAdvance !== true)
          .filter((transaction) => !transaction.reimbursementTransactionId)
          .map((transaction) => ({
            id: transaction.id,
            paymentSourceId: transaction.paymentSourceId,
          }));
      },
    },
  };
}

const sources: Source[] = [
  { id: 'bank-orea', ownerCompanyId: 'orea', kind: 'bank_account', archived: false },
  { id: 'visa-orea', ownerCompanyId: 'orea', kind: 'card', archived: false },
  { id: 'bank-levi', ownerCompanyId: 'orea', kind: 'bank_account', archived: false },
];

const jan29 = new Date(Date.UTC(2026, 0, 29));
const jan30 = new Date(Date.UTC(2026, 0, 30));

const cases = [
  {
    name: 'paiement Visa match unique',
    db: createDb(sources, [
      { id: 'visa-expense', paymentSourceId: 'visa-orea', type: 'expense', date: jan30, amountCents: 19709 },
    ]),
    input: {
      newTransactionId: 'bank-payment',
      paymentSourceId: 'bank-orea',
      date: jan29,
      amountTotal: 19709,
      description: 'Paiement /VISA DESJARDINS 01/26',
      type: 'expense' as const,
    },
    expected: 'visa-expense',
  },
  {
    name: 'virement Interac non auto',
    db: createDb(sources, [
      { id: 'external', paymentSourceId: 'bank-levi', type: 'expense', date: jan29, amountCents: 10000 },
    ]),
    input: {
      newTransactionId: 'interac',
      paymentSourceId: 'bank-orea',
      date: jan29,
      amountTotal: 10000,
      description: 'Virement Interac a Bruno Vignola',
      type: 'expense' as const,
    },
    expected: null,
  },
  {
    name: 'depot mobile income match expense meme jour',
    db: createDb(sources, [
      { id: 'source-expense', paymentSourceId: 'bank-levi', type: 'expense', date: jan29, amountCents: 750000 },
    ]),
    input: {
      newTransactionId: 'mobile-deposit',
      paymentSourceId: 'bank-orea',
      date: jan29,
      amountTotal: 750000,
      description: 'DEPOT MOBILE',
      type: 'income' as const,
    },
    expected: 'source-expense',
  },
  {
    name: 'multiple matches retourne null',
    db: createDb(sources, [
      { id: 'visa-expense-1', paymentSourceId: 'visa-orea', type: 'expense', date: jan30, amountCents: 19709 },
      { id: 'visa-expense-2', paymentSourceId: 'visa-orea', type: 'expense', date: jan30, amountCents: 19709 },
    ]),
    input: {
      newTransactionId: 'bank-payment',
      paymentSourceId: 'bank-orea',
      date: jan29,
      amountTotal: 19709,
      description: 'Paiement /VISA DESJARDINS 01/26',
      type: 'expense' as const,
    },
    expected: null,
  },
  {
    name: 'aucun match retourne null',
    db: createDb(sources, []),
    input: {
      newTransactionId: 'unknown',
      paymentSourceId: 'bank-orea',
      date: jan29,
      amountTotal: 12345,
      description: 'Paiement /VISA DESJARDINS 01/26',
      type: 'expense' as const,
    },
    expected: null,
  },
];

let passed = 0;

for (const testCase of cases) {
  const result = await detectInterAccountTransfer(testCase.input, testCase.db);
  const actual = result?.matchedTransactionId ?? null;

  if (actual === testCase.expected) {
    passed += 1;
    console.log(`PASS ${testCase.name}`);
  } else {
    console.error(`FAIL ${testCase.name}`, result);
  }
}

console.log(`${passed}/${cases.length} PASS`);
if (passed !== cases.length) process.exit(1);
