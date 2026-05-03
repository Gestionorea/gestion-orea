import {
  findBestMatch,
  parseInvoiceFilename,
  type InvoiceFile,
} from '../src/lib/invoice-matcher';

function invoice(itemId: string, filename: string): InvoiceFile {
  const parsed = parseInvoiceFilename(filename);
  return {
    itemId,
    filename,
    webUrl: `https://example.test/${filename}`,
    parsedDate: parsed.parsedDate,
    parsedKeywords: parsed.parsedKeywords,
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

console.log(`${passed}/${cases.length} PASS`);
if (passed !== cases.length) process.exit(1);
