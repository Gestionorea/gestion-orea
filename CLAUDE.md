# CLAUDE.md

## Projet

OREA est le site web de Gestion OREA. Ce fichier contient les regles locales de travail pour ce repo.

Le comportement global de Claude vient de `~/.claude/CLAUDE.md`. Ce fichier ne doit contenir que les regles specifiques a OREA.

## Point d'entree

Avant toute action, lire obligatoirement dans cet ordre:
1. `/Users/olivierlemieux/Documents/Claude nouvelle structure/02-projects/site-gestion-orea/01-contexte/project-brief.md`
2. `/Users/olivierlemieux/Documents/Claude nouvelle structure/02-projects/site-gestion-orea/01-contexte/active-context.md`
3. `/Users/olivierlemieux/Documents/Claude nouvelle structure/02-projects/site-gestion-orea/03-travail/backlog.md`
4. `/Users/olivierlemieux/Documents/Claude nouvelle structure/02-projects/site-gestion-orea/01-contexte/session-handoff.md`

Si l'un de ces fichiers est absent, vide, obsolescent ou contradictoire avec le repo, le signaler avant d'agir.

Ensuite seulement:
1. Inspecter la page, le composant ou le parcours reellement touches
2. Identifier l'objectif de la page et l'action attendue de l'utilisateur

## Reprise rapide

Si l'utilisateur ecrit `Bonjour`, interpreter cela comme une demande de reprise de session.

Dans ce cas:
- relire d'abord les fichiers obligatoires de contexte ci-dessus
- resumer ce qui a ete fait lors de la derniere session
- indiquer ce qui reste ouvert ou en suspens
- proposer la prochaine action concrete la plus intelligente pour continuer
- rester court, executif et oriente reprise immediate

## Stack et commandes

- Framework: Next.js
- Langage: TypeScript
- UI: React
- Build: `npm run build`
- Lint: `npm run lint`
- Dev: `npm run dev`

## Priorites locales

- Prioriser la clarte de l'offre, des parcours, de la hierarchie et des CTA
- Distinguer un vrai probleme UX d'une simple preference visuelle
- Signaler toute incoherence entre le positionnement, le contenu et l'interface
- Preserver la coherence linguistique et la structure i18n

## Zones importantes

- `src/app/[locale]` = structure des pages et routage localise
- `src/components/home` = accueil
- `src/components/about` = pages de presentation
- `src/components/contact` = conversion et prise de contact
- `src/components/tools` = outils et blocs metier
- `src/i18n` = configuration de langues

## Regles d'execution

- Pour une tache UX ou structurelle, analyser avant de proposer une refonte
- Pour une tache simple et locale, executer directement avec verification proportionnelle
- Toute modification significative doit etre validee au minimum par un build ou un controle logique adapte
- S'il n'existe pas de tests, ne pas pretendre qu'ils ont ete verifies

## Leviers specialises

- Pour une tache UI, UX, landing page, composant visuel ou refonte de parcours, considerer `frontend-design`.
- Pour un changement non trivial, une refonte structurelle, une revue avant consolidation ou une zone fragile, considerer `/code-review`.
- Pour les formulaires, actions serveur, integrations, traitements de donnees ou surfaces exposables au public, tenir compte de `security-guidance`.
- Pour une tache complexe de planification, debugging, decomposition ou verification, considerer `superpowers`.
- Pour une orchestration plus lourde, parallele ou multi-agents, considerer `ruflo` via MCP.

## Regles de code

- Une unite de code doit avoir une responsabilite claire.
- Preferer la lisibilite, la clarte metier et la maintenabilite a l'ingeniosite inutile.
- Ne pas dupliquer une logique metier importante sans raison explicite.
- Ne pas introduire d'abstraction prematuree ou de generalisation speculative.
- Eviter les composants, fonctions ou fichiers inutilement longs, denses ou multitaches. Si une unite devient difficile a comprendre, a tester, a modifier ou a revoir, proposer un decoupage plus clair.
- Si un changement peut casser un comportement existant, le signaler explicitement.
- Pour le frontend, ne pas sacrifier la clarte UX a l'effet visuel.
- Ne pas presenter un changement comme valide sans verification adaptee au risque.
