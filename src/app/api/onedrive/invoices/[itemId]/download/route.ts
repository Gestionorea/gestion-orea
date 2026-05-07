import { NextRequest, NextResponse } from 'next/server';
import { downloadItemContent, getItemById } from '@/lib/onedrive';
import { isInvoiceFile } from '@/lib/onedrive-invoices';
import { requireAuth } from '@/lib/permissions';

function safeFilename(filename: string): string {
  return filename.replace(/[^\w.\- ()]/g, '_').slice(0, 160) || 'facture';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  await requireAuth();
  const { itemId } = await params;
  const item = await getItemById(itemId);

  if (!item || !isInvoiceFile(item.name)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const buffer = await downloadItemContent(item.id);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeFilename(item.name)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
