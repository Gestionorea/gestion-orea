const SYNONYM_GROUPS: string[][] = [
  ['auto', 'voiture', 'vehicule', 'automobile', 'char', 'transport'],
  ['essence', 'carburant', 'gaz', 'gas', 'station', 'shell', 'esso', 'petro'],
  ['restaurant', 'resto', 'bouffe', 'diner', 'lunch', 'cafe', 'manger', 'nourriture', 'alimentation'],
  ['epicerie', 'iga', 'metro', 'maxi', 'provigo', 'super c'],
  ['electricite', 'electrique', 'hydro', 'energie', 'energir', 'gaz naturel'],
  ['internet', 'wifi', 'telecom', 'telecommunication', 'bell', 'rogers', 'videotron', 'telus', 'fido'],
  ['telephone', 'cellulaire', 'mobile', 'phone', 'cell'],
  ['assurance', 'beneva', 'intact', 'police', 'prime', 'assureur', 'couverture'],
  ['banque', 'bancaire', 'frais', 'service', 'desjardins'],
  ['carte', 'credit', 'visa', 'mastercard', 'mc', 'amex'],
  ['quincaillerie', 'reno', 'renovation', 'home depot', 'rona', 'canadian tire'],
  ['reparation', 'entretien', 'maintenance', 'travaux', 'fix'],
  ['loyer', 'revenu', 'rente', 'depot', 'recu', 'income'],
  ['salaire', 'paye', 'honoraires', 'commission', 'wage'],
  ['avance', 'pret', 'emprunt', 'remboursement'],
  ['bureau', 'fournitures', 'papeterie', 'staples'],
  ['voyage', 'hotel', 'avion', 'train', 'transport public'],
  ['sante', 'medical', 'medicament', 'pharmacie', 'docteur', 'dentiste'],
  ['impot', 'taxe', 'fiscal', 'tps', 'tvq', 'revenu canada', 'revenu quebec'],
  ['avocat', 'legal', 'juridique', 'notaire'],
  ['comptable', 'comptabilite', 'cpa'],
  ['cadeau', 'don', 'gift'],
  ['vetement', 'habit', 'linge', 'mode', 'fashion'],
  ['hypotheque', 'mortgage', 'logement', 'maison'],
  ['education', 'formation', 'cours', 'ecole', 'universite'],
  ['sport', 'gym', 'loisir', 'activite'],
  ['sortie', 'cinema', 'spectacle', 'theatre', 'concert', 'divertissement'],
  ['abonnement', 'subscription', 'netflix', 'spotify', 'disney'],
  ['menage', 'cleaning', 'nettoyage', 'femme de menage'],
  ['outils', 'outillage', 'equipement'],
];

const synonymIndex = new Map<string, Set<string>>();

function normalizeSearchTerm(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .trim();
}

for (const group of SYNONYM_GROUPS) {
  const normalizedGroup = group.map((term) => normalizeSearchTerm(term)).filter(Boolean);

  for (const term of normalizedGroup) {
    if (!synonymIndex.has(term)) synonymIndex.set(term, new Set());
    for (const other of normalizedGroup) {
      synonymIndex.get(term)?.add(other);
    }
  }
}

export function expandSynonyms(query: string): string[] {
  const normalized = normalizeSearchTerm(query);
  if (!normalized) return [];

  const words = normalized.split(/\s+/).filter(Boolean);
  const expanded = new Set<string>([normalized]);

  for (const word of words) {
    expanded.add(word);
    const synonyms = synonymIndex.get(word);
    if (synonyms) {
      for (const synonym of synonyms) expanded.add(synonym);
    }
  }

  return Array.from(expanded);
}

export function matchesExpandedSearch(categoryName: string, expandedTerms: string[]): boolean {
  if (expandedTerms.length === 0) return true;

  const normalized = normalizeSearchTerm(categoryName);
  return expandedTerms.some((term) => normalized.includes(term));
}

export const CATEGORY_SYNONYM_GROUP_COUNT = SYNONYM_GROUPS.length;
