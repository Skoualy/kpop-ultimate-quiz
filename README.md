# K-Pop Ultimate Quiz — v0.5.7 MVP (React / TypeScript)

Quiz K-Pop orienté dataset, contribution et modes de jeu, en cours de migration vers une architecture React + TypeScript modulaire.

## État du projet

Version actuelle : **v0.5.7 MVP**

Le projet est en transition depuis une ancienne base prototype vers une structure React / TypeScript plus propre, avec :

- un dataset structuré et extensible
- un contributor multi-étapes
- une page de gestion des groupes
- les fondations des modes de jeu **Save One** et **Blind Test**
- une cible de déploiement principale sur **application web** (et non plus Electron)

La source de vérité technique du projet est le document :

- `structure-technical-spec_fr.md`

---

## Prérequis

- **Node.js 18+**
- **npm 9+**

---

## Installation & lancement

```bash
npm install
npm run dev
```

L'application est ensuite disponible sur :

```text
http://localhost:5173
```

---

## Build production

```bash
npm run build
```

Les fichiers de build sont générés dans :

```text
dist/
```

---

## Stack technique

- **React 18** — interface utilisateur
- **TypeScript** — typage strict
- **Vite** — bundler / serveur de développement
- **React Router v6** — routing SPA
- **Zustand** — state management léger (si activé selon l’avancement des écrans)
- **Tailwind CSS** — layout, spacing, responsive, utilitaires visuels
- **SCSS Modules** — styles spécifiques par composant si nécessaire

> Règle générale :
>
> - **Tailwind** pour la structure et les utilitaires
> - **SCSS Modules** uniquement pour les styles custom non triviaux

---

## Structure actuelle du projet

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
│
├── features/
│   ├── config/
│   │   ├── ConfigPage.tsx
│   │   ├── ConfigPage.types.ts
│   │   └── components/
│   │
│   ├── groups/
│   │   ├── GroupsPage.tsx
│   │   ├── GroupsPage.types.ts
│   │   └── components/
│   │
│   ├── contributor/
│   │   ├── ContributorPage.tsx
│   │   ├── ContributorPage.types.ts
│   │   └── components/
│   │       └── steps/
│   │           ├── GroupInfoStep/
│   │           ├── MembersStep/
│   │           ├── SongsStep/
│   │           └── ExportStep/
│   │
│   ├── blind-test/
│   │   ├── BlindTestPage.tsx
│   │   └── BlindTestPage.types.ts
│   │
│   └── save-one/
│       ├── SaveOnePage.tsx
│       └── SaveOnePage.types.ts
│
├── shared/
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── models/
│   ├── services/
│   └── utils/
│
├── store/
│   ├── appStore.ts
│   └── gameStore.ts
│
└── styles/
    └── globals.scss
```

Cette structure suit l’architecture cible décrite dans la spec technique du projet.

---

## Structure du dataset

Le dataset est servi comme fichiers statiques et chargé via `fetch()`.
Il ne doit pas être importé statiquement dans les composants React.

### Structure cible

```text
public/
  dataset/
    groups/
      index.json
      girlGroup/
        twice.json
        misamo.json
      boyGroup/
        ateez.json
      femaleSoloist/
        nayeon.json
      maleSoloist/
        iu.json
    idols.json
    labels.json
```

### Règles importantes

- **`groups/index.json`** sert d’index minimal pour localiser les fichiers groupe
- un **groupe** est stocké dans `groups/{GroupCategory}/{groupId}.json`
- les **idoles** sont centralisées dans `idols.json`
- les **labels / agences** sont centralisés dans `labels.json`

---

## Structure des assets

```text
assets/
├── groups/
│   └── {groupId}/
│       └── cover.webp
├── idols/
│   └── {idolId}/
│       └── portrait.webp
└── placeholders/
    ├── group-cover.webp
    ├── idol-female.webp
    └── idol-male.webp
```

Formats recommandés :

- **cover groupe** : `600x600`
- **portrait idole** : `400x533`
- format image recommandé : **webp**

---

## Principes métier du dataset

- une **idole** représente une **personne unique**
- un **groupe** représente une **entité jouable / discographique**
- une **sub-unit** est un groupe avec `parentGroupId`
- un **soloist** est aussi un groupe
- pas de champ `solos` dans `discography`
- `discography` contient uniquement :
  - `titles`
  - `bSides`
- `language` absent = chanson coréenne implicite
- `company` = **agence principale unique** en v1
- les rôles sont obligatoires sur chaque `GroupMember` dans le dataset final

---

## Fonctionnalités principales

### 1. Page de configuration

- sélection du mode de jeu
- sélection des groupes
- filtres et paramètres de partie

### 2. Page Groupes

- vue de tous les groupes
- recherche / filtres
- navigation vers l’édition contributor

### 3. Contributor

Formulaire multi-étapes pour créer ou modifier un groupe :

- **Infos groupe**
- **Membres**
- **Musiques**
- **Export**

Règles métier déjà intégrées :

- une sub-unit réutilise les membres du groupe parent
- un soloist est géré comme un groupe
- une idole existante doit être réutilisée si c’est la même personne
- l’export génère un **bundle de contribution** pour intégration ultérieure

### 4. Save One

Mode de jeu en cours de finalisation pour :

- **idoles**
- **chansons**

### 5. Blind Test

Mode de jeu en cours de finalisation pour :

- **idoles**
- **chansons**

---

## Contributor — bundle de contribution

Le contributor n’écrit pas directement dans le dataset final.
Il produit un **bundle de contribution** destiné à être validé / fusionné ensuite.

Structure recommandée :

```ts
export interface ContributionBundle {
  meta: {
    schemaVersion: number
    generatedAt: string
  }
  group: Group
  idols: Idol[]
  labels?: Label[]
}
```

> Les labels peuvent être inclus si de nouvelles agences sont détectées lors de la contribution.
> Le merge Python / backend reste responsable de la validation finale.

---

## Services de données

Le projet repose sur une couche `fetch()` pour lire les fichiers dataset.

Services attendus :

- `groupService`
- `idolService`
- `labelService`
- `gameService`

Aucun import statique Vite du dataset ne doit être utilisé pour les données dynamiques.

---

## Routing principal

Routes prévues :

```text
/                     → ConfigPage
/groups               → GroupsPage
/contributor          → ContributorPage
/contributor/:groupId → ContributorPage (édition)
/blind-test           → BlindTestPage
/save-one             → SaveOnePage
```

Ces routes correspondent à l’architecture cible du projet.

---

## Déploiement cible

La cible principale n’est plus Electron.

Le projet vise un déploiement en **application web** sur un **Raspberry Pi 4**, servi en statique via Nginx / reverse proxy.

Arborescence indicative côté serveur :

```text
/opt/kpop-ultimate-quiz/
├── app/
│   └── dist/
├── api/
├── dataset/
├── assets/
├── backups/
└── logs/
```

---

## Conventions techniques

### Composants React

- 1 fichier = 1 composant
- `PascalCase` pour composants et dossiers de composants
- `index.ts` pour les barrel exports
- `default export` autorisé uniquement pour les pages
- `named export` pour les composants partagés

### Dataset / fichiers techniques

- `kebab-case` pour fichiers JSON, assets, scripts et fichiers techniques génériques
- `camelCase` pour champs et variables
- `UPPER_SNAKE_CASE` pour constantes partagées

---

## Référence technique

La documentation de référence du projet est :

```text
structure-technical-spec_fr.md
```

C’est le document à privilégier pour :

- la structure du dataset
- les types TypeScript
- les règles contributor
- les règles métier gameplay
- l’architecture frontend cible

---

## Roadmap immédiate

Priorités actuelles :

- finaliser la **GroupsPage**
- finaliser le **Contributor**
- remettre les features de base :
  - **Save One**
  - **Blind Test**
- stabiliser l’architecture avant une réorganisation/refactor plus large

---

## © Skoualy
