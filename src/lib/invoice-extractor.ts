import { z } from 'zod';

export const ExtractedInvoiceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  fournisseur: z.string().min(1).nullable(),
  montantTotal: z.number().nonnegative().nullable(),
  numeroFacture: z.string().nullable(),
  categorieSuggeree: z.string().nullable(),
  lastDigitsCarte: z.string().regex(/^\d{4}$/).nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']),
});
export type ExtractedInvoice = z.infer<typeof ExtractedInvoiceSchema>;

export type ExtractInput = {
  base64: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  filename?: string;
};

export type ExtractResult =
  | {
      ok: true;
      data: ExtractedInvoice;
      usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
    }
  | { ok: false; error: string; raw?: string };

type AnthropicClient = {
  messages: {
    create: (input: unknown) => Promise<{
      content: { type: string; text?: string }[];
      usage: {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
      };
    }>;
  };
};

type AnthropicConstructor = new (input: { apiKey: string }) => AnthropicClient;

class InvoiceExtractorError extends Error {}

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const SYSTEM_PROMPT = `Tu es un assistant comptable specialise dans l'extraction de donnees de factures quebecoises. Tu recois une facture (PDF ou image) et tu retournes UN SEUL objet JSON valide.

Regles:
- Retourne UNIQUEMENT du JSON valide, sans markdown, sans backticks, sans texte autour.
- Champs absents/illisibles: retourne null.
- Date au format ISO YYYY-MM-DD (ex: facture du 15 janvier 2026 -> "2026-01-15")
- montantTotal en CAD, nombre simple sans symbole (ex: 245.67)
- categorieSuggeree: un mot ou court groupe en francais (ex: "Telecommunications", "Quincaillerie", "Assurance"). Null si impossible.
- lastDigitsCarte: 4 derniers chiffres de la carte de credit/debit utilisee pour le paiement, si visible (ex: "0027"). Null si paiement comptant, virement, ou carte non visible.
- confidence: "high" si tout clair, "medium" si certains champs devines, "low" si flou ou mal cadre.

Schema:
{
  "date": "YYYY-MM-DD" | null,
  "fournisseur": string | null,
  "montantTotal": number | null,
  "numeroFacture": string | null,
  "categorieSuggeree": string | null,
  "lastDigitsCarte": "NNNN" | null,
  "confidence": "high" | "medium" | "low"
}`;

const extractionCache = new Map<string, ExtractResult>();

function requireEnv(): { apiKey: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new InvoiceExtractorError('ANTHROPIC_API_KEY env var missing');
  return { apiKey };
}

function sanitizeError(value: unknown): string {
  const fallback = 'Invoice extraction failed.';
  const raw = value instanceof Error ? value.message : typeof value === 'string' ? value : fallback;
  let message = raw;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) message = message.split(apiKey).join('[redacted]');
  return message;
}

function fileSizeBytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

async function loadAnthropic(): Promise<AnthropicConstructor> {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<{ default: AnthropicConstructor }>;
  const mod = await dynamicImport('@anthropic-ai/sdk');
  return mod.default;
}

function stripMarkdown(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function parseJson(raw: string): ExtractResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Anthropic response is not valid JSON.', raw };
  }

  const validated = ExtractedInvoiceSchema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, error: `JSON does not match schema: ${validated.error.message}`, raw };
  }

  return {
    ok: true,
    data: validated.data,
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 },
  };
}

async function createResponse(client: AnthropicClient, input: ExtractInput, retry: boolean) {
  return await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: input.mimeType === 'application/pdf' ? 'document' : 'image',
            source: {
              type: 'base64',
              media_type: input.mimeType,
              data: input.base64,
            },
          },
          {
            type: 'text',
            text: retry
              ? 'La reponse precedente etait invalide. Retourne uniquement un objet JSON valide selon le schema.'
              : 'Extrait les donnees structurees de cette facture. Retourne uniquement le JSON.',
          },
        ],
      },
    ],
  });
}

export async function extractInvoice(input: ExtractInput): Promise<ExtractResult> {
  try {
    const size = fileSizeBytes(input.base64);
    if (size > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        error: `File too large (${(size / 1024 / 1024).toFixed(1)}MB), skipped to avoid cost spike.`,
      };
    }

    const { apiKey } = requireEnv();
    const Anthropic = await loadAnthropic();
    const client = new Anthropic({ apiKey });
    let lastRaw: string | undefined;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await createResponse(client, input, attempt > 0);
      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock?.text) {
        return { ok: false, error: 'No text content in Anthropic response.' };
      }

      const raw = stripMarkdown(textBlock.text.trim());
      lastRaw = raw;
      const parsed = parseJson(raw);
      if (parsed.ok) {
        return {
          ok: true,
          data: parsed.data,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
          },
        };
      }
    }

    return { ok: false, error: 'Anthropic response is not valid JSON after retry.', raw: lastRaw };
  } catch (error) {
    return { ok: false, error: sanitizeError(error) };
  }
}

export async function extractInvoiceCached(itemId: string, input: ExtractInput): Promise<ExtractResult> {
  const cached = extractionCache.get(itemId);
  if (cached) return cached;
  const result = await extractInvoice(input);
  if (result.ok) extractionCache.set(itemId, result);
  return result;
}
