# K-Pop Ultimate Quiz — v0.5.5 MVP (React / TypeScript)

## Prérequis

- Node.js 18+ (https://nodejs.org)
- npm 9+

## Installation & lancement

```bash
npm install
npm run dev
```

L'app se lance sur http://localhost:5173

## Build production

```bash
npm run build
# Les fichiers sont dans dist/
```

## Structure du projet

```
src/
├── types/index.ts          # Tous les types TypeScript du domaine
├── data/
│   ├── idols.json          # Dataset des idoles
│   ├── labels.json         # Labels/agences
│   └── groups/             # Un fichier JSON par groupe
│       ├── twice.json
│       ├── misamo.json
│       └── nayeon.json
├── services/
│   └── dataService.ts      # Chargement, résolution, pools de jeu
├── context/
│   └── AppContext.tsx       # État global React (config + dataset)
├── components/
│   └── shared.tsx           # Composants partagés
├── pages/
│   ├── ConfigPage.tsx       # Configuration + sélection groupes
│   ├── GroupsPage.tsx       # Gestion des groupes
│   ├── ContributorPage.tsx  # Formulaire contributeur (4 étapes)
│   ├── BlindTestPage.tsx    # Mode Blind Test
│   └── SaveOnePage.tsx      # Mode Save One
├── App.tsx                  # Routing principal
├── main.tsx                 # Point d'entrée React
└── index.css                # Thème sombre + tous les styles
```

## Stack technique

- **React 18** — librairie UI
- **TypeScript** — typage strict
- **Vite** — bundler (remplace Webpack, ultra-rapide)
- **React Router v6** — routing SPA
- **DM Sans + DM Mono** — polices (Google Fonts)

## © Skoualy
