'use server';

import { listFolderItems, pingDrive, type OneDriveItem, type PingDriveResult } from '@/lib/onedrive';
import { requireOwner } from '@/lib/permissions';

type OneDriveTestState = {
  ping: PingDriveResult | null;
  items: OneDriveItem[] | null;
  error: string | null;
};

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'OneDrive test failed.';
}

export async function testConnectionAction(_prevState?: OneDriveTestState): Promise<OneDriveTestState> {
  try {
    await requireOwner();
    const ping = await pingDrive();
    const items = ping.ok ? await listFolderItems('/OREA-Factures/', 5) : null;

    return { ping, items, error: null };
  } catch (error) {
    return { ping: null, items: null, error: safeError(error) };
  }
}
