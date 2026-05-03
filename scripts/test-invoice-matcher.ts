import {
  extractAmountFromFilename,
  findBestMatch,
  parseInvoiceFilename,
  type InvoiceFile,
  type MatchInput,
} from '../src/lib/invoice-matcher';

function invoice(itemId: string, filename: string): InvoiceFile {
  const parsed = parseInvoiceFilename(filename);
  return {
    itemId,
    filename,
    webUrl: `https://example.test/${filename}`,
    parsedDate: parsed.parsedDate,
    parsedKeywords: parsed.parsedKeywords,
    parsedAmount: parsed.parsedAmount,
  };
}

const baseDate = new Date(Date.UTC(2026, 0, 15));

const cases = [
  {
    name: 'match parfait date et mots-cles',
    result: findBestMatch({
      transactionDate: baseDate,
      transactionDescription: 'HYDRO QUEBEC Paiement mensuel',
      invoices: [invoice('inv-1', '2026-01-15_Electricite_Hydro_Quebec.pdf')],
    }),
    expectFilename: '2026-01-15_Electricite_Hydro_Quebec.pdf',
  },
  {
    name: 'match faible mots-cles non communs',
    result: findBestMatch({
      transactionDate: baseDate,
      transactionDescription: 'BELL CANADA Internet',
      invoices: [invoice('inv-2', '2026-01-15_Restaurant_Cafe_Local.pdf')],
    }),
    expectFilename: null,
  },
  {
    name: 'match nul sans facture',
    result: findBestMatch({
      transactionDate: baseDate,
      transactionDescription: 'HYDRO QUEBEC',
      invoices: [],
    }),
    expectFilename: null,
  },
  {
    name: 'date trop loin',
    result: findBestMatch({
      transactionDate: baseDate,
      transactionDescription: 'HYDRO QUEBEC',
      invoices: [invoice('inv-3', '2026-02-15_Electricite_Hydro_Quebec.pdf')],
    }),
    expectFilename: null,
  },
  {
    name: 'meilleur match parmi plusieurs',
    result: findBestMatch({
      transactionDate: baseDate,
      transactionDescription: 'BELL CANADA INTERNET FIBRE',
      invoices: [
        invoice('inv-4', '2026-01-15_Telecom_Bell.pdf'),
        invoice('inv-5', '2026-01-15_Telecom_Bell_Canada_Internet.pdf'),
      ],
    }),
    expectFilename: '2026-01-15_Telecom_Bell_Canada_Internet.pdf',
  },
  {
    name: 'facture payee 60 jours apres emission, montant exact',
    result: findBestMatch({
      transactionDate: new Date('2026-03-15T00:00:00Z'),
      transactionDescription: 'PAIEMENT BELL CANADA',
      transactionAmount: 127.5,
      invoices: [
        {
          itemId: 'inv-6',
          filename: '2026-01-15_Telecom_Bell-facture_127.50.pdf',
          webUrl: 'https://example.test/bell',
          parsedDate: new Date('2026-01-15T00:00:00Z'),
          parsedKeywords: ['bell', 'facture', 'telecom'],
          parsedAmount: 127.5,
        },
      ],
    }),
    expectFilename: '2026-01-15_Telecom_Bell-facture_127.50.pdf',
  },
  {
    name: 'meme date mais montant different',
    result: findBestMatch({
      transactionDate: new Date('2026-03-15T00:00:00Z'),
      transactionDescription: 'X Y Z',
      transactionAmount: 99.99,
      invoices: [
        {
          itemId: 'inv-7',
          filename: '2026-03-15_Test_Random_500.00.pdf',
          webUrl: 'https://example.test/random',
          parsedDate: new Date('2026-03-15T00:00:00Z'),
          parsedKeywords: ['random'],
          parsedAmount: 500,
        },
      ],
    }),
    expectFilename: null,
  },
  {
    name: 'date plus de 90 jours',
    result: findBestMatch({
      transactionDate: new Date('2026-06-01T00:00:00Z'),
      transactionDescription: 'PAIEMENT BELL CANADA',
      transactionAmount: 127.5,
      invoices: [
        {
          itemId: 'inv-8',
          filename: '2026-01-15_Telecom_Bell-facture_127.50.pdf',
          webUrl: 'https://example.test/bell-far',
          parsedDate: new Date('2026-01-15T00:00:00Z'),
          parsedKeywords: ['bell', 'facture', 'telecom'],
          parsedAmount: 127.5,
        },
      ],
    } satisfies MatchInput),
    expectFilename: null,
  },
];

let passed = 0;

for (const testCase of cases) {
  const filename = testCase.result?.invoiceFilename ?? null;
  if (filename === testCase.expectFilename) {
    passed += 1;
    console.log(`PASS ${testCase.name}`);
  } else {
    console.error(`FAIL ${testCase.name}`, testCase.result);
  }
}

const amountFromFilename = extractAmountFromFilename('2026-02-15_Bell_127.50.pdf');
if (amountFromFilename === 127.5) {
  passed += 1;
  console.log('PASS extract amount from filename');
} else {
  console.error('FAIL extract amount from filename', amountFromFilename);
}

const noAmountFromFilename = extractAmountFromFilename('2026-02-15_Bell.pdf');
if (noAmountFromFilename === null) {
  passed += 1;
  console.log('PASS no amount in filename');
} else {
  console.error('FAIL no amount in filename', noAmountFromFilename);
}

const expected = cases.length + 2;
console.log(`${passed}/${expected} PASS`);
if (passed !== expected) process.exit(1);
