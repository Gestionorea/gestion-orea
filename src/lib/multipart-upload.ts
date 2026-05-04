export type MultipartFile = {
  fieldName: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
  size: number;
};

export type ParsedMultipart = {
  fields: Map<string, string[]>;
  files: MultipartFile[];
};

const MAX_MULTIPART_BYTES = 150 * 1024 * 1024;

function parseBoundary(contentType: string | null): string {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? '');
  const boundary = match?.[1] ?? match?.[2];
  if (!boundary) throw new Error('Missing multipart boundary.');
  return boundary.trim();
}

async function readBody(request: Request): Promise<Buffer> {
  if (!request.body) throw new Error('Missing request body.');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > MAX_MULTIPART_BYTES) throw new Error('Multipart body too large.');
    chunks.push(value);
  }

  return Buffer.concat(chunks, total);
}

function parseHeaderParams(value: string): Map<string, string> {
  const params = new Map<string, string>();
  const parts = value.split(';').map((part) => part.trim());

  for (const part of parts.slice(1)) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;

    const key = part.slice(0, separator).trim().toLowerCase();
    const raw = part.slice(separator + 1).trim();
    const unquoted = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
    params.set(key, decodeHeaderValue(unquoted));
  }

  return params;
}

function decodeHeaderValue(value: string): string {
  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? value : decoded;
}

function decodeExtendedHeaderValue(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const match = /^utf-8''(.+)$/i.exec(value);
  if (!match) return value;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return value;
  }
}

function parseHeaders(raw: string): Map<string, string> {
  const headers = new Map<string, string>();

  for (const line of raw.split('\r\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    headers.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }

  return headers;
}

export async function parseMultipartRequest(request: Request): Promise<ParsedMultipart> {
  const boundary = parseBoundary(request.headers.get('content-type'));
  const body = await readBody(request);
  const delimiter = Buffer.from(`--${boundary}`);
  const headerSeparator = Buffer.from('\r\n\r\n');
  const trailingCrlf = Buffer.from('\r\n');
  const fields = new Map<string, string[]>();
  const files: MultipartFile[] = [];

  let cursor = body.indexOf(delimiter);
  while (cursor !== -1) {
    cursor += delimiter.length;

    if (body.subarray(cursor, cursor + 2).toString('latin1') === '--') break;
    if (body.subarray(cursor, cursor + 2).equals(trailingCrlf)) cursor += 2;

    const next = body.indexOf(delimiter, cursor);
    if (next === -1) break;

    let part = body.subarray(cursor, next);
    if (part.subarray(part.length - 2).equals(trailingCrlf)) {
      part = part.subarray(0, part.length - 2);
    }

    const headerEnd = part.indexOf(headerSeparator);
    if (headerEnd === -1) {
      cursor = next;
      continue;
    }

    const headers = parseHeaders(part.subarray(0, headerEnd).toString('latin1'));
    const disposition = headers.get('content-disposition');
    if (!disposition) {
      cursor = next;
      continue;
    }

    const params = parseHeaderParams(disposition);
    const fieldName = params.get('name');
    if (!fieldName) {
      cursor = next;
      continue;
    }

    const content = part.subarray(headerEnd + headerSeparator.length);
    const filename = params.get('filename') ?? decodeExtendedHeaderValue(params.get('filename*'));
    if (filename !== undefined) {
      files.push({
        fieldName,
        filename,
        contentType: headers.get('content-type') ?? 'application/octet-stream',
        buffer: content,
        size: content.byteLength,
      });
    } else {
      const values = fields.get(fieldName) ?? [];
      values.push(content.toString('utf8'));
      fields.set(fieldName, values);
    }

    cursor = next;
  }

  return { fields, files };
}
