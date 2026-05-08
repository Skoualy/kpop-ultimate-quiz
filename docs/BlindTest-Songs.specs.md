# Blind Test — Chansons · Specs v1.0

> Document de référence pour l'implémentation du mode **Blind Test — Chansons**.
> À intégrer dans `structure-technical-spec_fr.md` une fois validé.

---

## 1. Layout UI

### Structure générale

```
┌──────────────────────────────────────────────────────┐
│  GameHud                                             │
│  [← Retour]  Round N/N · Options…   [Passer →]      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  🔴  Disque tournant (480 × 480)             │    │
│  │                                              │    │
│  │            [ ▶ ]  ← overlay Rejouer         │    │
│  │         (icône semi-transparent centré)      │    │
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ou (après révélation) :                             │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  iFrame YouTube · 16:9 · height = 480px      │    │
│  │  width ≈ 853px  (16/9 × 480)                │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ████████████████░░░░░  ← TimerBar (si présent)      │
│                                                      │
│       [ Artiste : ??? ]  [ Titre : ??? ]             │
│            ← badges centrés, côte à côte →           │
│                                                      │
│  [_______________________________________]           │
│   Appuie sur Entrée pour valider                     │
│                                                      │
│           [ Révéler la réponse ]                     │
│           ← visible si le mode le permet →           │
└──────────────────────────────────────────────────────┘
```

### Règles du bloc central

| État            | Dimensions                                  | Comportement                                              |
| --------------- | ------------------------------------------- | --------------------------------------------------------- |
| Disque tournant | 405 × 405 px (carré)                        | Animation CSS `rotate` infinie, bouton Rejouer en overlay |
| iFrame YouTube  | max-width : 720 px / height : 405 px (16:9) | Même hauteur que le disque, ratio 16:9 respecté           |

**Référence CSS Save One :** `SaveOneRoundSongs.module.scss` → `.iframeWrapper { max-width: 720px }` → height 16:9 = 720 × 9/16 = **405 px**.

- La **hauteur du bloc est constante à 405 px** dans les deux états : aucun décalage vertical des éléments en dessous lors du swap disque ↔ iframe.
- Le disque est carré (405×405), l'iframe est rectangulaire (≤720×405) — la largeur peut varier entre les deux états, ce qui est attendu et acceptable.
- Sur mobile : `width: 100%` avec `aspect-ratio` adapté au contexte (1/1 pour disque, 16/9 pour iframe).

### Bouton Rejouer — overlay sur le disque

- Icône ▶ centré en sur-impression sur le disque.
- Semi-transparent au repos, plein au hover.
- Visible uniquement si le mode le permet (voir tableau modes §4).
- En mode Hardcore : bouton absent.

### Badges de réponse

Deux badges affichés **côte à côte et centrés** sous le bloc, avec trois états évolutifs :

| Moment                  | Badge Artiste                  | Badge Titre                    |
| ----------------------- | ------------------------------ | ------------------------------ |
| Début du round          | `Artiste : ???` (neutre)       | `Titre : ???` (neutre)         |
| Artiste trouvé          | `Artiste : Mamamoo ✅` (vert)  | `Titre : ???` (neutre)         |
| Titre trouvé            | `Artiste : Mamamoo ✅` (vert)  | `Titre : Piano Man ✅` (vert)  |
| Révélation — trouvé     | `Artiste : Mamamoo ✅` (vert)  | `Titre : Piano Man ✅` (vert)  |
| Révélation — non trouvé | `Artiste : Mamamoo ❌` (rouge) | `Titre : Piano Man ❌` (rouge) |

---

## 2. Composant `AnswerInput` (control dédié)

> **Fichier :** `src/shared/Controls/AnswerInput/AnswerInput.tsx`
> Aucune logique métier interne — toute la logique de matching est dans le parent via les props.

### Props

```ts
interface AnswerInputProps {
  /** Callback déclenché à chaque appui sur Entrée */
  onSubmit: (value: string) => void
  /** Si true → input désactivé (round terminé, timeout, etc.) */
  disabled?: boolean
  /** Résultat du dernier submit : 'correct' | 'wrong' | null */
  lastResult?: 'correct' | 'wrong' | null
  placeholder?: string
}
```

### Comportement

- L'input **se vide systématiquement** à chaque appui sur Entrée, quel que soit le résultat.
- Le focus est **conservé** après soumission.
- En cas d'erreur (`lastResult === 'wrong'`) : animation **shake** + message de feedback éphémère (disparaît après ~1.5 s) parmi :
  - `"Mauvaise réponse !"`
  - `"Malheureusement, ce n'est pas la bonne réponse !"`
  - `"Réponse incorrecte ! Essaie encore..."`
  - Les messages **alternent** en séquence cyclique (pas aléatoire, pour garantir la variété sans répétition).
- En cas de succès (`lastResult === 'correct'`) : feedback visuel vert bref (border verte, pas de message texte — les badges suffisent).

---

## 3. Algorithme de matching fuzzy

> **Fichier :** `src/shared/utils/fuzzyMatch.ts`
> Pur TypeScript, sans dépendance externe, testable unitairement.

### Pipeline de normalisation

```
normalize(str) :
  1. toLowerCase()
  2. NFD decompose + supprimer diacritiques (accents, cédilles…)
  3. Supprimer tout caractère non alphanumérique non espace
  4. Trim + collaper espaces multiples

compact(str) :
  → normalize(str).replace(/\s+/g, '')
```

### Calcul de similarité

```
similarity(input, reference) → number [0..1] :
  a = compact(input)
  b = compact(reference)

  si a === b                              → 1.0   (exact)
  si b.includes(a) || a.includes(b)
    ET min(len(a), len(b)) >= 3           → 0.92  (inclusion significative)
  sinon → Levenshtein normalisé :
    1 - levenshtein(a, b) / max(len(a), len(b))

isMatch(input, reference, threshold) :
  → similarity(input, reference) >= threshold
```

L'algorithme de Levenshtein est implémenté en ~15 lignes de TS pur (matrice dp standard), sans lib externe.

### Niveaux de tolérance

Définis comme constantes dans `src/shared/constants/gameDefaults.ts` :

```ts
export const BLIND_TEST_MATCH_THRESHOLDS = {
  permissive: 0.8,
  tolerant: 0.9,
  strict: 1.0,
} as const

export type AnswerTolerance = keyof typeof BLIND_TEST_MATCH_THRESHOLDS
```

### Exemples de validation

| Input joueur | Référence   | compact input | compact réf | Score | Tolérant (≥0.90) |
| ------------ | ----------- | ------------- | ----------- | ----- | ---------------- |
| `pianoman`   | `Piano Man` | `pianoman`    | `pianoman`  | 1.00  | ✅               |
| `mamamo`     | `Mamamoo`   | `mamamo`      | `mamamoo`   | 0.875 | ❌               |
| `mamamoo`    | `Mamamoo`   | `mamamoo`     | `mamamoo`   | 1.00  | ✅               |
| `blakpink`   | `BLACKPINK` | `blakpink`    | `blackpink` | 0.888 | ❌               |
| `blackpink`  | `BLACKPINK` | `blackpink`   | `blackpink` | 1.00  | ✅               |
| `twice`      | `Twice`     | `twice`       | `twice`     | 1.00  | ✅               |
| `bts`        | `BTS`       | `bts`         | `bts`       | 1.00  | ✅               |

---

## 4. Comportement par mode de jeu

| Mode             | Timer        | Rejouer | Révéler (bouton) | Fin timer       | Passage round |
| ---------------- | ------------ | ------- | ---------------- | --------------- | ------------- |
| **Classique**    | Oui (config) | ✅      | ✅               | Révélation auto | Auto          |
| **Chill**        | Non          | ✅      | ✅               | —               | Auto          |
| **Spectateur**   | Config       | ✅      | ✅               | Révélation auto | Auto          |
| **Hardcore**     | 10 s 🔒      | ❌      | ❌               | Révélation auto | Auto          |
| **Personnalisé** | Config       | ✅      | ✅               | Révélation auto | Auto          |

**Tous les modes sont en passage automatique** (pas de mode "manuel").

**Fin de timer sans réponse complète** :

1. Révélation automatique des réponses non trouvées (badges en rouge).
2. Lancement immédiat de l'extrait YouTube (durée = `clipDuration` configurée).
3. Passage au round suivant après écoulement de l'extrait.
4. Score = 0 pour les éléments non trouvés (les points partiels déjà acquis sont conservés).

**Bouton "Passer" dans le HUD** :

- Agit comme une révélation forcée (0 pt pour les éléments restants).
- Les points déjà acquis dans le round en cours sont conservés.
- Une fois la réponse révélée (via bouton ou timer), cliquer "Passer" passe simplement au round suivant.

---

## 5. Système de scoring

### Points bruts par round

| Résultat                                                      | Points    |
| ------------------------------------------------------------- | --------- |
| Artiste **ET** titre trouvés **en une seule frappe** (Entrée) | **3 pts** |
| Artiste trouvé (frappe séparée)                               | **1 pt**  |
| Titre trouvé (frappe séparée)                                 | **1 pt**  |
| Élément non trouvé (révélation / timeout)                     | **0 pt**  |

→ Maximum par round : **3 pts** (tout en une frappe) ou **2 pts** (1+1 séparément).

---

## 6. Logique de l'input multi-étapes

À chaque appui sur Entrée :

1. Normaliser la saisie.
2. Tester contre les éléments **pas encore validés** :
   - Si artiste non validé → tester `isMatch(input, song.groupName, threshold)`.
   - Si titre non validé → tester `isMatch(input, song.title, threshold)`.
3. Résultats :
   - **Un élément matché** → badge correspondant passe en vert, `lastResult = 'correct'`, input se vide.
   - **Les deux matchés en une frappe** → round terminé, 3 pts, révélation immédiate.
   - **Aucun match** → `lastResult = 'wrong'`, shake + message éphémère, input se vide.
4. Quand artiste **ET** titre sont validés (même si en 2 frappes) → round terminé.

---

## 7. Mode 2 joueurs

### Principe

Le mode local crée un avantage pour J2 s'il entend l'extrait de J1.
**Solution : chaque joueur reçoit une chanson différente** au sein du même round.

### Déroulé

1. Construction du round → **2 chansons distinctes** tirées depuis le pool (une par joueur).
2. J1 joue avec sa chanson (`song1`).
3. Transition (overlay "Au tour de [J2]").
4. J2 joue avec une chanson différente (`song2`) — tirage sans remise dans le même round.
5. Timer et badges sont remis à zéro pour J2.
6. Scores indépendants : chaque joueur a ses propres `BlindTestAnswer`.

### Règle de tirage

- Les deux chansons d'un même round sont **obligatoirement différentes**.
- Les deux sont marquées "utilisées" en session à l'issue du round (aucune ne peut réapparaître dans la partie).
- Chacune reçoit son propre timestamp canonique indépendant (`pickCanonicalTimestamp()`).
- C'est pourquoi `itemsPerRound = 2` en mode 2J, ce qui est déjà géré par `computeItemsPerRound('blindTest', _, true)` dans `poolScopeRules.ts`.

---

## 8. Non-répétition des extraits

Même système que le Save One :

- Stockage en `sessionStorage` (clé : `kpq-song-session:blindTest-songs`).
- Une chanson ne peut pas réapparaître dans la même partie.
- En mode 2J : une chanson est marquée utilisée après le round complet (J1 + J2).
- Le tirage pondéré existant (`songSessionMemory.ts`) est réutilisé tel quel — le `SongModeKey` `'blindTest-songs'` est déjà prévu.

---

## 9. Rotation des groupes — fix transverse (Save One + Blind Test)

### Problème identifié

Avec un nombre pair de groupes et une logique de rotation par `lastRoundUsed`, les mêmes groupes reviennent systématiquement pour chaque joueur. Exemple avec 4 groupes [Twice, OMG, Everglow, IVE] et 2J :

- J1 → toujours Twice + Everglow
- J2 → toujours OMG + IVE

### Solution : shuffle contraint au rebouclage

Quand tous les groupes ont été utilisés une fois (fin d'un cycle), l'ordre est **reshufflé avec contrainte** : le nouvel index de chaque groupe doit différer de l'ancien d'au moins `D` positions.

```
D = max(itemsPerRound, floor(N / 2))

où :
  N              = nombre de groupes dans le scope
  itemsPerRound  = K items requis par round
                   (drops + 1 pour Save One, 1 ou 2 pour Blind Test)
```

**Algorithme de shuffle contraint :**

```
constrainedShuffle(groups, prevOrder, D):
  MAX_ATTEMPTS = 150
  Pour chaque tentative :
    candidat = Fisher-Yates(groups)
    Si pour tout i : |newIndex(g) - prevIndex(g)| >= D → retourner candidat
  Si aucune tentative valide → retourner Fisher-Yates sans contrainte (fallback)
```

### Centralisation

> **Fichier à créer :** `src/shared/services/groupRotationService.ts`

Ce service est **indépendant du mode de jeu**. Il expose :

```ts
interface GroupRotationService {
  /**
   * Retourne l'ordre de passage des groupes pour la partie.
   * Tient compte du cycle précédent pour éviter les patterns répétitifs.
   */
  buildGroupQueue(
    groups: Group[],
    itemsPerRound: number,
    prevOrder?: string[], // IDs groupes dans leur ordre du cycle précédent
  ): string[] // IDs groupes dans le nouvel ordre

  /** Persiste l'ordre utilisé en sessionStorage pour le prochain appel */
  saveGroupOrder(mode: SongModeKey, order: string[]): void

  /** Récupère l'ordre précédent depuis sessionStorage */
  loadGroupOrder(mode: SongModeKey): string[] | null
}
```

Le `poolBuilder.ts` du Save One sera **refactoré** pour déléguer la rotation à ce service.

---

## 10. Validation de la configuration (scope)

La logique est **déjà centralisée** dans `computeMaxRounds` / `computeItemsPerRound` (`poolScopeRules.ts`), qui gère nativement le mode `'blindTest'` :

```ts
// poolScopeRules.ts — déjà en place
computeItemsPerRound('blindTest', dropCount, twoPlayers)
// → twoPlayers ? 2 : 1
```

Il n'y a donc **rien à créer** pour le Blind Test : la validation de scope, le clampage des rounds et l'affichage du warning via `useConfigPreparation` + `PrepBanner` fonctionnent déjà. Il suffira de vérifier que `BlindTestPage` passe correctement `mode: 'blindTest'` au moment de la préparation, et que le bouton "Préparer la partie" est bien déclenché depuis `ConfigPage` avant le lancement.

---

## 11. Modèles de données

```ts
// BlindTestPage.types.ts

type BlindTestAnswerStatus =
  | 'idle' // round en cours, aucune réponse
  | 'partial' // un élément trouvé, l'autre non
  | 'complete' // artiste + titre trouvés
  | 'revealed' // révélation manuelle (bouton ou timeout)
  | 'timeout' // timer expiré sans réponse complète

interface BlindTestAnswer {
  playerIndex: 0 | 1
  status: BlindTestAnswerStatus
  artistMatched: boolean
  titleMatched: boolean
  /** true si artiste ET titre trouvés en une seule frappe (→ 3 pts) */
  foundInOneTry: boolean
  /** Durée en ms depuis le début du round jusqu'à la complétion (null si non complété) */
  timeMs: number | null
  /** Points bruts × multiplicateur mode */
  scoreGained: number
}

interface BlindTestRoundData {
  roundNumber: number
  /** Chanson jouée par J1 (ou unique en solo) */
  song1: SongItem // songId, title, groupName, youtubeId, thumbnailUrl, startTime
  /** Chanson jouée par J2 — null en solo, différente de song1 en 2J */
  song2: SongItem | null
  answers: BlindTestAnswer[] // [j1] ou [j1, j2]
}

/** Version plate pour GameSummary (analogue à RoundResult du Save One) */
interface BlindTestResult {
  roundIndex: number
  playerIndex: 0 | 1
  artistMatched: boolean
  titleMatched: boolean
  foundInOneTry: boolean
  timeMs: number | null
  scoreGained: number
  isTimeout: boolean
  isRevealed: boolean // révélation via bouton Révéler ou bouton Passer
}
```

---

## 12. Résumé de fin de partie (`BlindTestSummary`)

Réutilise `GameSummary` (layout identique Save One / Quick Vote).

### Stats par joueur

| Stat                     | Détail                      |
| ------------------------ | --------------------------- |
| Score total              | pts × multiplicateur        |
| Réponses complètes       | N / total (artiste + titre) |
| Artistes trouvés         | N / total + %               |
| Titres trouvés           | N / total + %               |
| Trouvées du premier coup | N / total (icône ⚡ ou ★)   |

### Affichage 2 joueurs

- Comparaison des scores en header → **gagnant mis en évidence**.
- En cas d'égalité de score : le gagnant est celui avec le **meilleur temps moyen de réponse** (sur les rounds complétés).
- "★ Même réponse !" si les deux joueurs ont trouvé les mêmes éléments au même round.

### Contenu par round (analogue Quick Vote)

| Résultat                        | Libellé affiché       | Style           |
| ------------------------------- | --------------------- | --------------- |
| Artiste + Titre trouvés         | ✅ Bonne réponse      | Vert            |
| Artiste + Titre du premier coup | ⚡ Bonne réponse !    | Vert + badge ⚡ |
| Un seul élément trouvé          | 🟡 Réponse incomplète | Ambre           |
| Aucun élément trouvé            | ❌ Non trouvée        | Rouge / atténué |

Affiche la miniature de la chanson + titre + artiste pour chaque round.

---

## 13. Composants et fichiers prévus

```
features/blind-test/
├── BlindTestPage.tsx              ← orchestration, état de jeu
├── BlindTestPage.types.ts         ← BlindTestRoundData, BlindTestAnswer, BlindTestResult
└── components/
    ├── SpinningDisc/
    │   ├── SpinningDisc.tsx       ← disque animé + overlay Rejouer + swap iFrame
    │   └── SpinningDisc.module.scss
    └── BlindTestSummary/
        ├── BlindTestSummary.tsx   ← réutilise GameSummary
        ├── BlindTestSummary.types.ts
        └── BlindTestSummary.module.scss

shared/
├── Controls/
│   └── AnswerInput/
│       ├── AnswerInput.tsx        ← control input dédié (aucune logique métier)
│       └── AnswerInput.module.scss
├── services/
│   └── groupRotationService.ts   ← rotation groupes avec shuffle contraint (transverse)
└── utils/
    └── fuzzyMatch.ts             ← normalize, compact, similarity, isMatch
```

### Réutilisé sans modification

- `GameHud` — déjà générique
- `GameSummary` — déjà générique
- `songSessionMemory.ts` — `SongModeKey` `'blindTest-songs'` déjà prévu
- `timestampHelper.ts` — `pickCanonicalTimestamp()` réutilisé tel quel
- `computeMaxRounds` / `useConfigPreparation` — réutilisés pour la validation

---

## 14. Ajout dans `GameConfig`

```ts
// Champ à ajouter dans l'interface GameConfig existante

/** Niveau de tolérance du matching fuzzy — Blind Test uniquement */
answerTolerance: AnswerTolerance // 'permissive' | 'tolerant' | 'strict' — défaut : 'tolerant'
```

**Emplacement dans la ConfigPage** : section "Options de la partie" (toujours visible dès que `mode === 'blindTest'`), sous le bloc Timer / Durée extraits.

Rendu : `BadgeGroupControl` single-select avec les labels :

- `Permissif` (≥ 80 %)
- `Tolérant` (≥ 90 %) ← défaut
- `Strict` (100 %)

---

## 15. Points hors scope de cette spec (à traiter séparément)

- **Blind Test — Idoles** : affichage portrait (partiel ou complet ?), logique de réponse spécifique → specs à définir.
- **Blind Test — mode 2J transition overlay** : réutiliser l'overlay existant du Save One ou créer un composant partagé.
- **Anti-scroll vertical** : stratégie de compaction adaptative de l'interface (déjà dans la roadmap v0.6.2).
