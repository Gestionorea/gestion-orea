import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

export const PdfTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  amount: z.number(),
});

export const PdfStatementSchema = z.object({
  transactions: z.array(PdfTransactionSchema),
  warnings: z.array(z.string()).optional(),
});

export type PdfTransaction = z.infer<typeof PdfTransactionSchema>;
export type PdfStatement = z.infer<typeof PdfStatementSchema>;

export type PdfExtractInput = {
  base64: string;
  filename?: string;
};

export type PdfExtractResult =
  | {
      ok: true;
      data: PdfStatement;
      usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
    }
  | { ok: false; error: string; raw?: string };

type AnthropicClient = {
  messages: {
    create: (input: unknown) => Promise<{
      content: { type: string; text?: string }[];
      stop_reason?: string | null;
      usage: {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
      };
    }>;
  };
};

type AnthropicConstructor = new (input: { apiKey: string }) => AnthropicClient;

class PdfExtractorError extends Error {}

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const SYSTEM_PROMPT = `Tu es un assistant comptable specialise dans l'extraction de donnees de releves de carte de credit quebecois (Desjardins, RBC, BNC, etc.).

Tu recois un PDF de releve mensuel et tu retournes UN SEUL objet JSON valide contenant la liste de TOUTES les transactions du releve.

Regles strictes:
- Retourne UNIQUEMENT du JSON valide, sans markdown, sans backticks, sans texte autour.
- Format date: YYYY-MM-DD (ex: "2026-02-15"). Convertis si le PDF utilise un autre format.
- Description: garde le texte exact tel qu'affiche dans le releve (sans truncation, sans normalisation).
- Amount:
  - POSITIF = depense / achat (ex: 245.67)
  - NEGATIF = paiement recu / credit / remboursement (ex: -1500.00)
  - Devise CAD uniquement, valeur sans symbole $.
- IGNORE:
  - Les en-tetes/pieds de page recurrents (page 1 sur N, etc.)
  - Le solde, le paiement minimum, la date d'echeance, le taux d'interet
  - Les sections promotionnelles ou messages bancaires
  - Les transactions deja annulees (lignes barrees)
- INCLURE TOUTES les vraies transactions, peu importe le nombre (50, 100, 200+).
- Si une description s'etale sur 2 lignes, concatener avec un espace.

Si le PDF est illisible ou n'est pas un releve carte credit, retourne:
{"transactions": [], "warnings": ["Format non reconnu"]}

Schema JSON exact:
{
  "transactions": [
    { "date": "YYYY-MM-DD", "description": "<texte>", "amount": <number> },
    ...
  ],
  "warnings": ["<string>", ...]
}`;

const extractionCache = new Map<string, PdfExtractResult>();

function requireEnv(): { apiKey: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new PdfExtractorError('ANTHROPIC_API_KEY env var missing');
  return { apiKey };
}

function sanitizeError(value: unknown): string {
  const fallback = 'PDF statement extraction failed.';
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

function parseJson(raw: string): PdfExtractResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Anthropic response is not valid JSON.', raw };
  }

  const validated = PdfStatementSchema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, error: `JSON ne match pas schema: ${validated.error.message}`, raw };
  }

  return {
    ok: true,
    data: validated.data,
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 },
  };
}

async function createResponse(client: AnthropicClient, input: PdfExtractInput, retry: boolean) {
  return await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
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
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: input.base64,
            },
          },
          {
            type: 'text',
            text: retry
              ? 'La reponse precedente etait invalide ou coupee. Reprends depuis le PDF et retourne uniquement un objet JSON valide avec toutes les transactions.'
              : 'Extrait toutes les transactions de ce releve carte de credit. Retourne uniquement le JSON.',
          },
        ],
      },
    ],
  });
}

export async function extractPdfStatement(input: PdfExtractInput): Promise<PdfExtractResult> {
  try {
    const size = fileSizeBytes(input.base64);
    if (size > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        error: `PDF too large (${(size / 1024 / 1024).toFixed(1)}MB), skipped.`,
      };
    }

    const { apiKey } = requireEnv();
    const Anthropic = await loadAnthropic();
    const client = new Anthropic({ apiKey });
    let lastRaw: string | undefined;
    let lastError = 'Anthropic response is not valid JSON after retry.';

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await createResponse(client, input, attempt > 0);
      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock?.text) {
        return { ok: false, error: 'No text in Anthropic response.' };
      }

      const raw = stripMarkdown(textBlock.text.trim());
      lastRaw = raw;
      const parsed = parseJson(raw);
      if (parsed.ok && response.stop_reason !== 'max_tokens') {
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

      if (response.stop_reason === 'max_tokens') {
        lastError = 'Anthropic response was cut off.';
      } else if (!parsed.ok) {
        lastError = parsed.error;
      }
    }

    return { ok: false, error: lastError, raw: lastRaw };
  } catch (error) {
    return { ok: false, error: sanitizeError(error) };
  }
}

export async function extractPdfStatementCached(itemId: string, input: PdfExtractInput): Promise<PdfExtractResult> {
  const cached = extractionCache.get(itemId);
  if (cached) return cached;
  const result = await extractPdfStatement(input);
  if (result.ok) extractionCache.set(itemId, result);
  return result;
}

export function pdfTransactionsToParsedRows(transactions: PdfTransaction[]): {
  date: Date;
  description: string;
  amountTotal: Decimal;
  type: 'income' | 'expense';
  rawRowNumber: number;
}[] {
  return transactions.map((transaction, index) => {
    const isCredit = transaction.amount < 0;
    return {
      date: new Date(`${transaction.date}T00:00:00.000Z`),
      description: transaction.description.trim(),
      amountTotal: new Decimal(Math.abs(transaction.amount).toFixed(2)),
      type: isCredit ? 'income' : 'expense',
      rawRowNumber: index + 1,
    };
  });
}
