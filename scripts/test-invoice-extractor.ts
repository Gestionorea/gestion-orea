import { extractInvoice, ExtractedInvoiceSchema } from '../src/lib/invoice-extractor';

async function main() {
  const parsed = ExtractedInvoiceSchema.safeParse({
    date: '2026-01-15',
    fournisseur: 'Hydro Quebec',
    montantTotal: 245.67,
    numeroFacture: 'ABC-123',
    categorieSuggeree: 'Electricite',
    confidence: 'high',
  });

  if (!parsed.success) {
    throw new Error('Schema should accept valid simulated JSON.');
  }

  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const missingEnv = await extractInvoice({
    base64: Buffer.from('not a real invoice').toString('base64'),
    mimeType: 'image/png',
    filename: 'fake.png',
  });

  if (missingEnv.ok || !missingEnv.error.includes('ANTHROPIC_API_KEY')) {
    throw new Error('Missing env guard did not return expected error.');
  }

  const tooLarge = await extractInvoice({
    base64: Buffer.alloc(6 * 1024 * 1024).toString('base64'),
    mimeType: 'application/pdf',
    filename: 'too-large.pdf',
  });

  if (tooLarge.ok || !tooLarge.error.includes('File too large')) {
    throw new Error('Large file cost guard did not return expected error.');
  }

  if (originalApiKey) process.env.ANTHROPIC_API_KEY = originalApiKey;

  console.log(JSON.stringify({ ok: true, checks: ['schema', 'missing-env', 'large-file'] }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
