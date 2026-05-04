type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

type OneDriveEnv = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  userPrincipal: string;
};

type GraphDriveResponse = {
  quota?: {
    total?: number;
    used?: number;
  };
};

type GraphListResponse = {
  value?: OneDriveItem[];
  '@odata.nextLink'?: string;
};

export type OneDriveItem = {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  lastModifiedDateTime: string;
  folder?: { childCount?: number };
};

export type PingDriveResult =
  | { ok: true; userPrincipalName: string; driveQuota: { used: string; total: string } }
  | { ok: false; error: string; statusCode?: number };

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
let tokenCache: TokenCache | null = null;

class OneDriveError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

function requireEnv(): OneDriveEnv {
  const required = [
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'ONEDRIVE_USER_PRINCIPAL',
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      throw new OneDriveError(`OneDrive env var ${key} missing`);
    }
  }

  const clientSecret = (process.env.AZURE_CLIENT_SECRET as string).trim();

  if (
    /[\r\n]/.test(clientSecret) ||
    /^\s*[A-Z0-9_]+\s*=/m.test(clientSecret) ||
    /<[^>]+>/.test(clientSecret)
  ) {
    throw new OneDriveError(
      'OneDrive env var AZURE_CLIENT_SECRET invalid: expected the Azure client secret value only.',
    );
  }

  return {
    tenantId: process.env.AZURE_TENANT_ID as string,
    clientId: process.env.AZURE_CLIENT_ID as string,
    clientSecret,
    userPrincipal: process.env.ONEDRIVE_USER_PRINCIPAL as string,
  };
}

function sanitizeError(value: unknown): string {
  const fallback = 'OneDrive request failed.';
  const raw = value instanceof Error ? value.message : typeof value === 'string' ? value : fallback;
  let message = raw;

  for (const key of ['AZURE_CLIENT_SECRET', 'AZURE_CLIENT_ID', 'AZURE_TENANT_ID'] as const) {
    const secretValue = process.env[key];
    if (secretValue) {
      message = message.split(secretValue).join('[redacted]');
    }
  }

  return message;
}

function formatGb(value?: number): string {
  if (!value || !Number.isFinite(value)) return '0 GB';
  const gb = value / 1024 / 1024 / 1024;
  return `${gb.toFixed(gb >= 100 ? 0 : 1)} GB`;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  const env = requireEnv();
  const now = Date.now();

  if (!forceRefresh && tokenCache && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.accessToken;
  }

  const response = await fetch(`https://login.microsoftonline.com/${env.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.clientId,
      client_secret: env.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });

  if (!response.ok) {
    tokenCache = null;
    throw new OneDriveError('Microsoft Graph authentication failed. Verify AZURE_CLIENT_SECRET value.', response.status);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };

  if (!payload.access_token) {
    tokenCache = null;
    throw new OneDriveError('Microsoft Graph authentication did not return an access token.');
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: now + (payload.expires_in ?? 3600) * 1000,
  };

  return tokenCache.accessToken;
}

async function graphFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status !== 401) return response;

  tokenCache = null;
  const refreshedToken = await getAccessToken(true);

  return await fetch(`${GRAPH_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${refreshedToken}`,
    },
  });
}

async function graphFetchUrl(url: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status !== 401) return response;

  tokenCache = null;
  const refreshedToken = await getAccessToken(true);

  return await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${refreshedToken}`,
    },
  });
}

async function graphJson<T>(path: string): Promise<T> {
  const response = await graphFetch(path);

  if (!response.ok) {
    throw new OneDriveError(`Microsoft Graph returned ${response.status}.`, response.status);
  }

  return (await response.json()) as T;
}

function encodeDrivePath(folderPath: string): string {
  const normalized = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
  return normalized
    .replace(/\/+$/g, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function normalizeFolderPath(folderPath: string): string {
  return folderPath
    .replace(/^\/+/g, '')
    .replace(/\/+$/g, '')
    .replace(/\/+/g, '/');
}

function joinDrivePath(...parts: string[]): string {
  return normalizeFolderPath(parts.filter(Boolean).join('/'));
}

export async function pingDrive(): Promise<PingDriveResult> {
  try {
    const env = requireEnv();
    const drive = await graphJson<GraphDriveResponse>(
      `/users/${encodeURIComponent(env.userPrincipal)}/drive`,
    );

    return {
      ok: true,
      userPrincipalName: env.userPrincipal,
      driveQuota: {
        used: formatGb(drive.quota?.used),
        total: formatGb(drive.quota?.total),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: sanitizeError(error),
      statusCode: error instanceof OneDriveError ? error.statusCode : undefined,
    };
  }
}

export async function listFolderItems(folderPath: string, top = 5): Promise<OneDriveItem[]> {
  const env = requireEnv();
  const encodedFolderPath = encodeDrivePath(folderPath);
  const response = await graphFetch(
    `/users/${encodeURIComponent(env.userPrincipal)}/drive/root:${encodedFolderPath}:/children?$top=${top}&$select=id,name,size,webUrl,lastModifiedDateTime`,
  );

  if (response.status === 404) return [];

  if (!response.ok) {
    throw new OneDriveError(`Microsoft Graph returned ${response.status}.`, response.status);
  }

  const payload = (await response.json()) as GraphListResponse;
  return payload.value ?? [];
}

export async function downloadItemContent(itemId: string): Promise<Buffer> {
  const env = requireEnv();
  const response = await graphFetch(
    `/users/${encodeURIComponent(env.userPrincipal)}/drive/items/${encodeURIComponent(itemId)}/content`,
  );

  if (!response.ok) {
    throw new OneDriveError(`Microsoft Graph returned ${response.status}.`, response.status);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function listFolderItemsByPath(folderPath: string): Promise<OneDriveItem[]> {
  const env = requireEnv();
  const encodedFolderPath = encodeDrivePath(folderPath);
  let nextUrl: string | null =
    `${GRAPH_BASE_URL}/users/${encodeURIComponent(env.userPrincipal)}/drive/root:${encodedFolderPath}:/children?$top=200&$select=id,name,size,webUrl,lastModifiedDateTime,folder`;
  const items: OneDriveItem[] = [];

  while (nextUrl) {
    const response = await graphFetchUrl(nextUrl);
    if (response.status === 404) return [];

    if (!response.ok) {
      throw new OneDriveError(`Microsoft Graph returned ${response.status}.`, response.status);
    }

    const payload = (await response.json()) as GraphListResponse;
    items.push(...(payload.value ?? []));
    nextUrl = payload['@odata.nextLink'] ?? null;
  }

  return items;
}

export async function uploadFileToFolder(
  folderPath: string,
  filename: string,
  contents: Buffer,
): Promise<OneDriveItem> {
  const env = requireEnv();
  const filePath = encodeDrivePath(joinDrivePath(folderPath, filename));
  const response = await graphFetch(
    `/users/${encodeURIComponent(env.userPrincipal)}/drive/root:${filePath}:/content`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Blob([new Uint8Array(contents)]),
    },
  );

  if (!response.ok) {
    throw new OneDriveError(`Microsoft Graph returned ${response.status}.`, response.status);
  }

  return (await response.json()) as OneDriveItem;
}

async function folderExists(folderPath: string): Promise<boolean> {
  const env = requireEnv();
  const encodedFolderPath = encodeDrivePath(folderPath);
  const response = await graphFetch(
    `/users/${encodeURIComponent(env.userPrincipal)}/drive/root:${encodedFolderPath}`,
  );

  if (response.status === 404) return false;

  if (!response.ok) {
    throw new OneDriveError(`Microsoft Graph returned ${response.status}.`, response.status);
  }

  return true;
}

async function createFolder(parentPath: string, folderName: string): Promise<void> {
  const env = requireEnv();
  const encodedParentPath = parentPath ? encodeDrivePath(parentPath) : '';
  const parentSelector = encodedParentPath
    ? `/drive/root:${encodedParentPath}:/children`
    : '/drive/root/children';
  const response = await graphFetch(
    `/users/${encodeURIComponent(env.userPrincipal)}${parentSelector}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    },
  );

  if (response.status === 409) return;

  if (!response.ok) {
    throw new OneDriveError(`Microsoft Graph returned ${response.status}.`, response.status);
  }
}

export async function ensureFolderExists(folderPath: string): Promise<void> {
  const normalized = normalizeFolderPath(folderPath);
  if (!normalized) return;

  const parts = normalized.split('/');
  let currentPath = '';

  for (const part of parts) {
    const nextPath = joinDrivePath(currentPath, part);
    if (!(await folderExists(nextPath))) {
      await createFolder(currentPath, part);
    }
    currentPath = nextPath;
  }
}

async function getFolderId(folderPath: string): Promise<string | null> {
  const env = requireEnv();
  const encoded = encodeDrivePath(folderPath);
  const response = await graphFetch(
    `/users/${encodeURIComponent(env.userPrincipal)}/drive/root:${encoded}?$select=id`,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new OneDriveError(`Microsoft Graph returned ${response.status}.`, response.status);
  }
  const payload = (await response.json()) as { id?: string };
  return payload.id ?? null;
}

export type MovedItem = {
  id: string;
  webUrl: string;
};

export async function moveItemToFolder(
  itemId: string,
  destinationFolderPath: string,
  options?: { newName?: string },
): Promise<MovedItem> {
  const env = requireEnv();
  await ensureFolderExists(destinationFolderPath);
  const folderId = await getFolderId(destinationFolderPath);
  if (!folderId) {
    throw new OneDriveError(`Destination folder not found after creation: ${destinationFolderPath}`);
  }

  const body: Record<string, unknown> = { parentReference: { id: folderId } };
  if (options?.newName) body.name = options.newName;

  const response = await graphFetch(
    `/users/${encodeURIComponent(env.userPrincipal)}/drive/items/${encodeURIComponent(itemId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new OneDriveError(`Microsoft Graph returned ${response.status} on move.`, response.status);
  }

  const payload = (await response.json()) as { id?: string; webUrl?: string };
  if (!payload.id || !payload.webUrl) {
    throw new OneDriveError('Microsoft Graph move response missing id or webUrl.');
  }
  return { id: payload.id, webUrl: payload.webUrl };
}
