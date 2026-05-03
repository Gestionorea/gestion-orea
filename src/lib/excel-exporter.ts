import ExcelJS from 'exceljs';
import type { TransactionRow } from './transactions';

export type ExportInput = {
  transactions: TransactionRow[];
  periodLabel: string;
};

const HEADERS = [
  'Date',
  'Marchand',
  'Description',
  'Avant taxes',
  'GST',
  'QST',
  'Total',
  'Type',
  'Categorie',
  'Compagnie',
  'Immeuble',
  'Source',
  'Reconciliee',
  'Date conciliation',
  'Reconciliee par',
  'URL facture',
] as const;

function amount(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOnly(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : '';
}

function sourceLabel(transaction: TransactionRow): string {
  if (!transaction.paymentSource) return '';
  return transaction.paymentSource.lastDigits
    ? `${transaction.paymentSource.name} ****${transaction.paymentSource.lastDigits}`
    : transaction.paymentSource.name;
}

function typeLabel(type: TransactionRow['type']): string {
  return type === 'income' ? 'Revenu' : 'Depense';
}

function fitColumns(worksheet: ExcelJS.Worksheet): void {
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    if (!column.eachCell) return;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const raw = cell.value;
      const value = typeof raw === 'object' && raw && 'text' in raw ? raw.text : raw;
      maxLength = Math.max(maxLength, String(value ?? '').length);
    });
    column.width = Math.min(Math.max(maxLength + 2, 12), 48);
  });
}

export async function exportTransactionsToXlsx(input: ExportInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OREA';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = input.periodLabel;

  const worksheet = workbook.addWorksheet('Transactions');
  worksheet.addRow([...HEADERS]);

  const header = worksheet.getRow(1);
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };
  });

  for (const transaction of input.transactions) {
    const row = worksheet.addRow([
      dateOnly(transaction.date),
      transaction.merchantName,
      transaction.justification ?? '',
      amount(transaction.amountBeforeTax),
      amount(transaction.gst),
      amount(transaction.qst),
      amount(transaction.amountTotal),
      typeLabel(transaction.type),
      transaction.category?.name ?? '',
      transaction.company?.name ?? '',
      transaction.property?.name ?? '',
      sourceLabel(transaction),
      transaction.reconciledAt ? 'Oui' : 'Non',
      dateOnly(transaction.reconciledAt),
      transaction.reconciledBy?.username ?? '',
      transaction.attachmentUrl
        ? {
            text: transaction.attachmentUrl,
            hyperlink: transaction.attachmentUrl,
          }
        : '',
    ]);

    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(5).numFmt = '#,##0.00';
    row.getCell(6).numFmt = '#,##0.00';
    row.getCell(7).numFmt = '#,##0.00';
  }

  const footer = worksheet.addRow([
    '',
    'Totaux',
    '',
    { formula: `SUM(D2:D${input.transactions.length + 1})` },
    { formula: `SUM(E2:E${input.transactions.length + 1})` },
    { formula: `SUM(F2:F${input.transactions.length + 1})` },
    { formula: `SUM(G2:G${input.transactions.length + 1})` },
  ]);
  footer.font = { bold: true };
  [4, 5, 6, 7].forEach((cellIndex) => {
    footer.getCell(cellIndex).numFmt = '#,##0.00';
  });

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, worksheet.rowCount), column: HEADERS.length },
  };
  fitColumns(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
