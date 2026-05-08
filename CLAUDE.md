# CLAUDE.md — kpop-ultimate-quiz

Fichier de référence lu automatiquement par Claude Code à chaque session.

---

## Vue d'ensemble du projet

**kpop-ultimate-quiz** est une application web de quiz K-Pop (blind-test, save-one, quick-vote) construite avec :

- **React 18** + **TypeScript 5**
- **Vite 5** (bundler)
- **Tailwind CSS 3** + **SCSS Modules** (styles, préfixe `kq-` pour les classes custom Tailwind)
- **React Router 6**
- **ESLint** + **Prettier**

### Commandes utiles

```bash
npm run dev       # Démarrer le serveur de développement
npm run build     # Build de production (tsc + vite build)
npm run lint      # Vérifier le lint (0 warning toléré)
npm run format    # Formater le code avec Prettier
```

---

## Documentation technique

La spec technique complète est dans **`docs/structure-technical-spec_fr.md`**.

- Toujours la consulter avant d'implémenter une fonctionnalité ou un composant
- Ne jamais modifier ni supprimer une spec existante sans accord explicite de l'utilisateur
- Si une mise à jour de la spec est pertinente suite à une implémentation, la proposer sans l'appliquer automatiquement

---

## Règles de développement (à appliquer systématiquement)

### Réutilisation avant tout

Avant toute implémentation, **inspecter `src/shared/`** pour trouver ce qui existe déjà :

| Dossier | Contenu |
|---------|---------|
| `shared/Controls/` | 18 contrôles de formulaire (Input, Select, Slider, Toggle, Badge…) |
| `shared/Components/` | 14 composants présentationnels (GameHud, IdolCard, TimerBar, YouTubePlayer…) |
| `shared/PureComponents/` | Composants purs sans état (Badge, ConfigCard, StatusBar) |
| `shared/Layout/` | Structure globale (AppHeader, Footer, Layout, GameShell) |
| `shared/hooks/` | Hooks réutilisables (useAsync, useGameTimer, useIdolPool…) |
| `shared/constants/` | Toutes les constantes centralisées |
| `shared/services/` | Couche données (gameService, groupService, idolService) |
| `shared/utils/` | Fonctions utilitaires (assets, youtube, slug, placeholder) |

### Un composant React = un fichier

- Chaque fichier `.tsx` ne contient **qu'un seul composant React** exporté par défaut
- Si un fichier existant en contient plusieurs : les segmenter en fichiers séparés, mettre à jour les imports, et mentionner le refactoring dans la réponse
- Exceptions acceptées : fichiers `index.ts` (re-exports uniquement) et fichiers `.types.ts`

### Aucune duplication de logique

- Zéro implémentations parallèles faisant la même chose dans des fichiers différents
- Si un control générique existe mais qu'une implémentation inline est présente ailleurs : remplacer l'inline par le control générique et adapter le code en conséquence

### Création dans `/shared`

- Composant/control réutilisable non encore existant → le créer dans `src/shared/Components/` ou `src/shared/Controls/`
- Logique métier commune → l'extraire dans `src/shared/services/` ou `src/shared/hooks/`
- Convention de fichiers : `NomComposant/NomComposant.tsx` + `NomComposant/index.ts` (re-export)

### Constantes centralisées

- **Aucune valeur en dur** dans les composants ou services
- Toutes les constantes vont dans `src/shared/constants/` (fichier thématique approprié)
- Si une constante est redéclarée localement dans un composant : la remplacer par l'import depuis `constants/` et supprimer la déclaration locale

### Commentaires intelligents

- Commenter **uniquement ce qui n'est pas évident** : contrainte cachée, invariant subtil, contournement de bug spécifique
- Ne pas décrire ce que le code fait (les noms explicites suffisent)
- Une seule ligne max par commentaire — pas de blocs multi-lignes

### Arborescence maîtrisée

- Pas de sous-dossiers inutiles ni d'imbrications profondes ("mille-feuilles")
- La structure de `features/contributor/components/steps/` est un anti-pattern à ne **pas** reproduire
- Objectif : arborescence plate, lisible, prévisible

---

## Conventions de nommage

| Élément | Convention |
|---------|------------|
| Composants React | `PascalCase` |
| Hooks | `camelCase` préfixé `use` |
| Services | `camelCase` suffixé `Service` |
| Types / Interfaces | `PascalCase` dans `.types.ts` ou `models/` |
| Constantes | `SCREAMING_SNAKE_CASE` |
| Fichiers SCSS | `NomComposant.module.scss` |
| Enums | dans `src/shared/models/enums.ts` |

---

## Workflow git

- **Branche de développement** : `blind-test`
- Commits clairs et descriptifs (français ou anglais)
- Push : `git push -u origin blind-test`
