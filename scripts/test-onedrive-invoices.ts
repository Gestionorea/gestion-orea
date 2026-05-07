import {
  filterInvoiceItems,
  isInvoiceFile,
  normalizeInvoiceSearch,
} from '../src/lib/onedrive-invoices';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const items = [
  {
    id: '1',
    name: 'Petro Canada 2026-04-02.pdf',
    size: 1200,
    webUrl: 'https://example.test/1',
    lastModifiedDateTime: '2026-04-03T10:00:00Z',
  },
  {
    id: '2',
    name: 'notes.txt',
    size: 20,
    webUrl: 'https://example.test/2',
    lastModifiedDateTime: '2026-04-04T10:00:00Z',
  },
  {
    id: '3',
    name: 'COUCHE TARD.jpg',
    size: 500,
    webUrl: 'https://example.test/3',
    lastModifiedDateTime: '2026-04-05T10:00:00Z',
  },
];

assert(isInvoiceFile('facture.PDF'), 'PDF should be accepted case-insensitively.');
assert(isInvoiceFile('scan.jpeg'), 'JPEG should be accepted.');
assert(!isInvoiceFile('notes.txt'), 'Text files should be rejected.');
assert(normalizeInvoiceSearch('  Couche   Tard ') === 'couche tard', 'Search should normalize spacing and casing.');

const filtered = filterInvoiceItems(items, 'petro');
assert(filtered.length === 1, 'Search should return matching invoice files only.');
assert(filtered[0].id === '1', 'Petro invoice should match petro search.');

const allInvoices = filterInvoiceItems(items, '');
assert(allInvoices.length === 2, 'Empty search should return all invoice files only.');
assert(allInvoices[0].id === '3', 'Newest invoice should sort first.');

console.log('onedrive-invoices: PASS');
