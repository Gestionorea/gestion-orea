# AGENTS.md - Repo orea-site

Lu automatiquement par Codex/Claude Code. Source de verite pour toute revue ou modification de ce repo.

## 1. Stack et contexte

- Next.js 15 (App Router), TypeScript strict, React 19
- Prisma + Postgres, next-intl (FR/EN), Tailwind, shadcn/ui
- Deploiement Railway, DNS GoDaddy
- Repo racine : `/Users/olivierlemieux/Projects/orea-site`
- Distinct du centre de pilotage (`~/Documents/Claude/site-gestion-orea`) - ne jamais
  modifier de fichier hors du repo orea-site
- Avant toute modification, verifier `pwd`, `git status -sb`, `git remote -v`
  et `package.json`
- Le remote attendu est `https://github.com/Gestionorea/gestion-orea.git`
- Le nom attendu dans `package.json` est `"gestion-orea"`
- Si le contexte ne correspond pas, stopper et demander confirmation
- Le scope par defaut d'une revue est le diff courant, pas tout le repo
- Un repo sale est normal : proteger les changements non lies

## 2. Regles de modification - whitelist stricte

Autorise sans accord explicite (micro-fix surs uniquement) :
1. Suppression d'imports inutilises detectes par TypeScript ou ESLint
2. Suppression de commentaires morts (TODO obsoletes, code commente > 30 jours)
3. Suppression de variables declarees-non-utilisees confirmees par le compilateur

Avant tout micro-fix :
- confirmer que le fichier est dans le scope demande
- confirmer que le changement ne modifie pas le comportement
- confirmer que le changement ne touche pas une zone critique

Tout le reste exige un rapport + accord avant modification :
- Toute "simplification" de logique, meme equivalente en apparence
- Tout refactor, extraction, renommage non-trivial
- Toute suppression de code suppose mort
- Toute modification de : i18n, API, auth, permissions, Prisma, server actions,
  routes, middleware, calculs financiers ou comptables
- Toute modification du diff non-commite de l'utilisateur
- Tout changement qui deplace une responsabilite entre client, serveur, API ou DB
- Tout changement qui renomme un fichier sous `src/app`
- Tout changement qui pourrait modifier une URL, une route ou un formulaire

Interdictions :
- ne jamais utiliser `git add -A`
- ne jamais commit, push, stash ou deploy sans demande explicite
- ne jamais masquer un risque sous "petit nettoyage"

## 3. Validation - langage honnete

`npm run lint` + `npm run build` valident **style et compilation seulement**.
Ils ne valident pas le comportement.

Pas de tests automatises sur la majorite du repo. La validation comportementale
exige soit (a) un test cible ecrit pour le changement, soit (b) une revue manuelle
explicite par l'utilisateur.

Le rapport doit dire clairement :
- ce qui a ete verifie par commande
- ce qui a ete verifie par lecture humaine
- ce qui reste non teste
- ce qui demande une decision utilisateur

## 4. Tests obligatoires - zones critiques

Tout changement touchant les zones suivantes doit etre accompagne d'un test ou
d'une validation fonctionnelle ciblee, ou explicitement marque comme non teste
dans le rapport :

- Schemas Zod et validation d'entree
- Server actions et route handlers API
- Mutations Prisma
- Calculs financiers, comptables, fiscaux
- Permissions et logique d'authentification

Si le changement est dans ces zones et qu'aucun test n'existe, le reviewer doit
le signaler dans le rapport, pas le contourner.

Si un test est recommande mais non ecrit :
- expliquer le risque en langage simple
- indiquer le comportement exact a tester
- ne pas presenter le changement comme comportementalement valide

## 5. i18n - regles FR/EN

- `messages/fr.json` et `messages/en.json` doivent rester structurellement identiques
- Toute cle ajoutee en FR doit etre ajoutee en EN, et vice-versa
- Asymetries volontaires (contenu adapte par marche) doivent etre marquees par
  un commentaire `// asymmetric:reason` dans le code utilisant la cle
- Ne jamais "corriger" une asymetrie sans verifier qu'elle n'est pas volontaire
- Verifier les deux langues quand une page, un CTA, un formulaire ou une erreur
  utilisateur change
- Ne pas ajouter de texte visible directement dans un composant si le pattern
  local utilise `next-intl`
- Les differences de ton marketing FR/EN sont permises seulement si elles sont
  intentionnelles et tracables
