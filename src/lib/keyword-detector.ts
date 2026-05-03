import type { CategoryItem } from './categories';
import { normalizeDescription } from './dedup-hash';

export type KeywordRule = {
  keywords: string[];
  categoryNamePattern: RegExp;
  defaultName: string;
};

export type KeywordDetection = {
  categoryId: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
  suggestedName?: string;
};

export const KEYWORD_RULES: KeywordRule[] = [
  {
    keywords: ['visa desjardins', 'paiement visa desjardins'],
    categoryNamePattern: /(avance|paiement.*carte|carte.*credit|carte.*crédit)/i,
    defaultName: 'Avance inter-comptes',
  },
  {
    keywords: ['visa', 'mastercard', 'mc'],
    categoryNamePattern: /(carte|visa|paiement.*credit|paiement.*crédit)/i,
    defaultName: 'Paiement carte',
  },
  {
    keywords: ['sci lease', 'lease', 'location auto'],
    categoryNamePattern: /(vehicule|véhicule|location auto)/i,
    defaultName: 'Véhicule',
  },
  {
    keywords: ['beneva', 'desjardins assurance', 'intact', 'assurance', 'police'],
    categoryNamePattern: /assurance/i,
    defaultName: 'Assurance',
  },
  {
    keywords: ['hydro', 'electricite', 'electricité', 'energie', 'energir'],
    categoryNamePattern: /(electric|électric|energie|énergie)/i,
    defaultName: 'Électricité',
  },
  {
    keywords: ['bell', 'telus', 'videotron', 'rogers', 'fido'],
    categoryNamePattern: /(telecom|télécom|téléc)/i,
    defaultName: 'Télécommunications',
  },
  {
    keywords: ['depot mobile', 'virement interac recu', 'loyer'],
    categoryNamePattern: /(loyer|revenu)/i,
    defaultName: 'Revenu loyer',
  },
  {
    keywords: ['paiement', 'prelevement', 'prelevement', 'frais banc', 'frais fixes', 'frais utilisation'],
    categoryNamePattern: /(frais.*banc|frais.*compte)/i,
    defaultName: 'Frais bancaires',
  },
  {
    keywords: ['home depot', 'reno depot', 'canadian tire', 'rona'],
    categoryNamePattern: /(quincaill|reno|réno|materiaux|matériaux)/i,
    defaultName: 'Quincaillerie',
  },
  {
    keywords: ['shell', 'esso', 'petro', 'ultramar', 'essence'],
    categoryNamePattern: /essence/i,
    defaultName: 'Essence',
  },
  {
    keywords: ['restaurant', 'resto', 'tim hortons', 'mcdonald', 'subway', 'starbucks'],
    categoryNamePattern: /restaurant/i,
    defaultName: 'Restaurant',
  },
];

function normalizeKeyword(value: string): string {
  return normalizeDescription(value);
}

export function isInterAccountAdvanceDescription(description: string): boolean {
  const normalized = normalizeDescription(description);
  return KEYWORD_RULES[0].keywords.some((keyword) => normalized.includes(normalizeKeyword(keyword)));
}

export function detectCategoryByKeywords(
  description: string,
  allCategories: Pick<CategoryItem, 'id' | 'name'>[],
): KeywordDetection {
  const normalized = normalizeDescription(description);
  if (!normalized) return { categoryId: null, confidence: 'none', reason: 'Description vide' };

  for (const rule of KEYWORD_RULES) {
    const matchedKeyword = rule.keywords.find((keyword) => normalized.includes(normalizeKeyword(keyword)));
    if (!matchedKeyword) continue;

    const existing = allCategories.find((category) => rule.categoryNamePattern.test(category.name));
    if (existing) {
      return {
        categoryId: existing.id,
        confidence: 'high',
        reason: `Mot-cle "${matchedKeyword}" detecte`,
      };
    }

    return {
      categoryId: null,
      confidence: 'medium',
      reason: `Mot-cle detecte mais categorie inexistante. Suggestion: "${rule.defaultName}"`,
      suggestedName: rule.defaultName,
    };
  }

  return { categoryId: null, confidence: 'low', reason: 'Aucun mot-cle reconnu' };
}
