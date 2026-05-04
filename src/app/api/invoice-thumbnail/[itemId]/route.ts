import { NextRequest, NextResponse } from 'next/server';
import { graphFetch, getUserPrincipal } from '@/lib/onedrive';
import { requireOwner } from '@/lib/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  await requireOwner();
  const { itemId } = await params;
  const userPrincipal = getUserPrincipal();

  const response = await graphFetch(
    `/users/${encodeURIComponent(userPrincipal)}/drive/items/${encodeURIComponent(itemId)}/thumbnails/0/medium/content`,
  );

  if (!response.ok) {
    return new NextResponse(null, { status: response.status === 404 ? 404 : 502 });
  }

  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      'Cache-Control': 'private, max-age=300',
      'Content-Type': response.headers.get('content-type') ?? 'image/jpeg',
    },
  });
}
