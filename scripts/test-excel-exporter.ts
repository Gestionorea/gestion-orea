import ExcelJS from 'exceljs';
import { exportTransactionsToXlsx } from '../src/lib/excel-exporter';
import type { TransactionRow } from '../src/lib/transactions';

function mockTransaction(index: number): TransactionRow {
  return {
    id: `tx-${index}`,
    type: index === 1 ? 'income' : 'expense',
    date: new Date(2026, 0, index),
    merchantName: `Marchand ${index}`,
    amountBeforeTax: '100.00',
    gst: '5.00',
    qst: '9.98',
    amountTotal: '114.98',
    taxRegime: 'taxable_qc',
    paymentMethod: 'credit_card',
    paymentSourceId: 'source-1',
    paymentSource: {
      id: 'source-1',
      name: 'Visa affaires',
      lastDigits: '1234',
      isPersonal: false,
      ownerCompanyId: null,
      ownerCompany: null,
    },
    isAdvance: false,
    reimbursedAt: null,
    beneficiary: 'company',
    invoiceNumber: `INV-${index}`,
    justification: `Justification ${index}`,
    attachmentUrl: index % 2 === 0 ? `https://example.com/invoice-${index}.pdf` : null,
    attachmentItemId: index % 2 === 0 ? `item-${index}` : null,
    propertyId: null,
    companyId: null,
    categoryId: null,
    property: null,
    company: { id: 'company-1', name: 'OREA' },
    category: { id: 'category-1', name: 'Fournitures' },
    createdBy: { id: 'user-1', username: 'owner' },
    createdAt: new Date(2026, 0, index),
    updatedAt: new Date(2026, 0, index),
    reconciledAt: index <= 3 ? new Date(2026, 0, index + 1) : null,
    reconciledBy: index <= 3 ? { id: 'user-2', username: 'comptable' } : null,
    reimbursementTransactionId: null,
    reimbursementTransaction: null,
    reimbursementOf: null,
    visualStatus: 'invoice_ok',
  };
}

async function main() {
  const transactions = Array.from({ length: 5 }, (_, index) => mockTransaction(index + 1));
  const buffer = await exportTransactionsToXlsx({
    transactions,
    periodLabel: 'Janvier 2026',
  });

  if (buffer.length === 0) {
    throw new Error('Buffer vide');
  }

  const workbook = new ExcelJS.Workbook();
  const xlsxBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(xlsxBuffer);
  const worksheet = workbook.getWorksheet('Transactions');
  if (!worksheet) throw new Error('Worksheet Transactions introuvable');

  const firstHeader = worksheet.getRow(1).getCell(1).value;
  if (firstHeader !== 'Date') {
    throw new Error(`Header invalide: ${String(firstHeader)}`);
  }

  const expectedRows = transactions.length + 2;
  if (worksheet.rowCount !== expectedRows) {
    throw new Error(`Nombre de lignes invalide: ${worksheet.rowCount}, attendu ${expectedRows}`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      bufferBytes: buffer.length,
      rows: worksheet.rowCount,
      header: firstHeader,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
