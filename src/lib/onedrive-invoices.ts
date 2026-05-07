import type { OneDriveItem } from '@/lib/onedrive';

const INVOICE_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

export function isInvoiceFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return Array.from(INVOICE_EXTENSIONS).some((extension) => lower.endsWith(extension));
}

export function normalizeInvoiceSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function filterInvoiceItems(items: OneDriveItem[], search: string): OneDriveItem[] {
  const normalizedSearch = normalizeInvoiceSearch(search);

  return items
    .filter((item) => isInvoiceFile(item.name))
    .filter((item) => {
      if (!normalizedSearch) return true;
      return normalizeInvoiceSearch(item.name).includes(normalizedSearch);
    })
    .sort(
      (a, b) =>
        new Date(b.lastModifiedDateTime).getTime() -
        new Date(a.lastModifiedDateTime).getTime(),
    );
}

export function monthInvoiceFolderPath(year: number, month: number): string {
  const monthFolders: Record<number, string> = {
    1: '01-Janvier',
    2: '02-Fevrier',
    3: '03-Mars',
    4: '04-Avril',
    5: '05-Mai',
    6: '06-Juin',
    7: '07-Juillet',
    8: '08-Aout',
    9: '09-Septembre',
    10: '10-Octobre',
    11: '11-Novembre',
    12: '12-Decembre',
  };

  return `Comptabilite/${year}/${monthFolders[month]}/Factures`;
}
