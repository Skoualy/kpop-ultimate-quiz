# ConfigPage — Spécifications techniques / Technical Specifications

---

## 🇫🇷 Français

### Vue d'ensemble

La page de configuration est le point d'entrée principal de l'application. Elle permet de paramétrer une partie avant de la lancer. La configuration est **automatiquement persistée** dans le `localStorage` à chaque modification et restaurée à l'ouverture suivante.

---

### Structure de la page

La page est organisée en **3 sections** affichées en colonne pleine largeur, toujours dans le même ordre. La position des sections ne change jamais — seul le contenu interne s'adapte.

```
┌─────────────────────────────────────────┐
│ CHOIX DU JEU                            │
│  Type de quiz | Catégorie | Mode de jeu │
├─────────────────────────────────────────┤
│ OPTIONS DE LA PARTIE                    │
│  Drops* | Rounds | Timer | Durée*       │
│  Mode 2 joueurs + Pseudos               │
├─────────────────────────────────────────┤
│ OPTIONS SUPPLÉMENTAIRES (Personnalisé)  │
│  Critère + Rôles* | Type chansons*      │
│  Groupes [dual-list]                    │
└─────────────────────────────────────────┘
* = selon mode et catégorie
```

---

### Section "Choix du jeu"

Un seul `ConfigCard` avec 3 champs en flex :

| Champ | Options |
|---|---|
| **Type de quiz** | Save One / Blind Test / Tournoi *(disabled — bientôt disponible)* |
| **Catégorie** | Idoles / Chansons |
| **Mode de jeu** | Classique / Chill / Spectateur / Hardcore / Personnalisé |

---

### Modes de jeu

| Mode | Timer | Durée extrait | Révélation | Round suivant | Rejouer | XP |
|---|---|---|---|---|---|---|
| **Classique** | Dropdown éditable (défaut 15s) | Input éditable (défaut 10s) | Bouton ou fin timer | Auto | ✅ | ×1 |
| **Chill** | Forcé à 0 🔒 | Input éditable (défaut 15s) | Bouton uniquement | Manuel | ✅ | ×0.5 |
| **Spectateur** | Dropdown éditable (défaut 0) | Input éditable (défaut 10s) | Bouton ou fin timer | Manuel | ✅ | ×0 |
| **Hardcore** | Forcé 10s 🔒 | Forcé 5s 🔒 | Fin timer uniquement | Auto | ❌ | ×2 |
| **Personnalisé** | Dropdown libre (défaut 15s) | Input libre (défaut 10s) | Bouton | Manuel | ✅ | ×1 |

**Règles :**
- `timerSeconds = 0` → pas de timer
- Champs verrouillés affichés en `disabled` avec leur valeur imposée
- Lecture automatique des extraits : toujours active
- Le mode **Personnalisé** déverrouille la section "Options supplémentaires"

---

### Dropdown Timer

Valeurs : `Pas de timer (0)` | `5 sec` | `10 sec` | `15 sec` | `20 sec` | `25 sec` | `30 sec`

La clé est la valeur numérique (`timerSeconds`). `0` = pas de timer.

---

### Section "Options de la partie"

#### Bloc 1 — Paramètres numériques
Champs en flex, s'adaptent à la largeur disponible.

| Champ | Condition | Contraintes |
|---|---|---|
| Drops (1–4) | Save One uniquement | Min 1, max 4 — hint : N+1 choix par round |
| Rounds (1–20) | Toujours | Min 1, max 20 |
| Timer | Toujours | Dropdown — `disabled` si Chill ou Hardcore |
| Durée extraits (1–15s) | Catégorie Chansons | Input numérique — `disabled` si Hardcore |

#### Bloc 2 — Mode 2 joueurs
- Toggle "Mode 2 joueurs" à gauche + description
- Joueur 1 et Joueur 2 à droite
- Les deux inputs sont `disabled` si le mode 2J est désactivé
- Si mode 2J activé : les deux champs sont **obligatoires**
- Si un pseudo est vide → message d'erreur rouge sous l'input + bouton "Lancer" désactivé

---

### Section "Options supplémentaires" *(mode Personnalisé uniquement)*

Visible uniquement quand `gamePlayMode === 'custom'`.

Contenu dans un seul `ConfigCard` :

#### Si catégorie = Idoles
- **Critère** (`BadgeGroupControl`, single-select) :
  Tous / Beauté / Personnalité / Voix / Performance / Leadership / Aegyo / Aléatoire
- **Rôles** (`BadgeGroupControl`, **multi-select**) : filtrés selon le critère sélectionné

#### Si catégorie = Chansons
- **Type de chansons** (`BadgeGroupControl`, single-select) :
  Tous / Titles / B-sides / Debut songs

#### Dans tous les cas
- **Sélecteur de groupes** (dans une `ConfigCard` séparée à l'intérieur)

---

### Critères — Save One

| Critère | Rôles disponibles |
|---|---|
| `all`, `beauty`, `personality`, `voice`, `aegyo`, `random` | Tous |
| `performance` | mainVocal, vocal, mainDancer, dancer, mainRapper, rapper |
| `leadership` | leader uniquement |

Si des rôles sélectionnés deviennent indisponibles après un changement de critère, ils sont **automatiquement retirés** de la sélection.

---

### BadgeGroupControl — rôles (multi-select)

- Sélection multiple : cliquer sur plusieurs rôles les ajoute tous à `roleFilters[]`
- Cliquer sur un rôle déjà sélectionné le désélectionne
- `roleFilters = []` → tous les rôles (aucun filtre)
- Les rôles indisponibles selon le critère ne sont pas affichés
- Réutilisable dans le Contributor pour les membres (prop `availableRoles` optionnelle)

---

### Sélecteur de groupes

**Tri** : alphabétique sur `name`

**Filtres appliqués en intersection (ET logique) :**

| Filtre | Type | Source |
|---|---|---|
| Recherche texte | Input | Frappe libre |
| Année de début | Select | Dynamique — années présentes dans le dataset |
| Label/Agence | Select | Dynamique — labels présents dans le dataset |
| Génération | FilterBadgeGroupControl (single) | Dynamique — gens présentes dans le dataset |
| Catégorie | FilterBadgeGroupControl (single) | Dynamique — catégories présentes dans le dataset |

**Important :** les valeurs des filtres dynamiques (années, labels, générations) sont calculées sur **tous les groupes**, pas sur les groupes filtrés, pour ne pas fausser les options disponibles.

**Dual-list :**
- Clic simple → highlight
- Double-clic → transfert immédiat
- `»` `›` `‹` `«` → transfert avec/sans sélection
- Hauteur fixe 240px + scroll vertical

**Badges dans les rows :**
- `SUB` (amber) → `parentGroupId` défini
- `SOLO` (violet) → `femaleSoloist` ou `maleSoloist`

---

### Bouton "Lancer la partie"

Désactivé si :
- Mode 2 joueurs activé avec un pseudo vide
- Mode Personnalisé sans groupe sélectionné

Dans tous les autres cas : toujours actif (joue avec tous les groupes disponibles).

---

### GameConfig

```ts
interface GameConfig {
  mode:             'saveOne' | 'blindTest'
  gamePlayMode:     'classic' | 'chill' | 'spectator' | 'hardcore' | 'custom'
  category:         'idols' | 'songs'
  rounds:           number           // 1–20
  timerSeconds:     number           // 0 = pas de timer
  clipDuration:     number           // 1–15
  drops:            number           // 1–4 (Save One uniquement)
  criterion:        SaveOneCriterion // utilisé en mode Personnalisé + idoles
  roleFilters:      MemberRole[]     // [] = tous — multi-select
  songType:         'all' | 'titles' | 'bSides' | 'debutSongs'
  twoPlayerMode:    boolean
  player1Name:      string
  player2Name:      string
  selectedGroupIds: string[]         // utilisé en mode Personnalisé
}
```

**Note :** `criterion`, `roleFilters`, `songType`, `selectedGroupIds` sont conservés en mémoire hors mode Personnalisé mais ignorés par le moteur de jeu.

---

### Composants utilisés

| Composant | Type | Usage |
|---|---|---|
| `ToggleControl` | Control | Mode 2 joueurs |
| `BadgeGroupControl<T>` | Control | Critère, Rôles, Type chansons (rendu pur) |
| `FilterBadgeGroupControl<T>` | Control | Filtres Gen/Cat groupes (wrapper logique → délègue le rendu à `BadgeGroupControl`) |
| `ConfigCard` | PureComponent | Wrapper de bloc de configuration |
| `LoadingSpinner` | Component | Chargement des groupes |

---

---

## 🇬🇧 English

### Overview

The configuration page is the main entry point of the application. It allows players to set up a game before launching it. The configuration is **automatically persisted** in `localStorage` on every change and restored on next load.

---

### Page structure

The page is organized in **3 sections** displayed as a full-width single column, always in the same order. Section positions never change — only internal content adapts.

---

### "Game choice" section

A single `ConfigCard` with 3 flex fields:

| Field | Options |
|---|---|
| **Quiz type** | Save One / Blind Test / Tournament *(disabled — coming soon)* |
| **Category** | Idols / Songs |
| **Game mode** | Classic / Chill / Spectator / Hardcore / Custom |

---

### Game modes

| Mode | Timer | Clip duration | Reveal | Next round | Replay | XP |
|---|---|---|---|---|---|---|
| **Classic** | Dropdown editable (default 15s) | Input editable (default 10s) | Button or timer end | Auto | ✅ | ×1 |
| **Chill** | Forced to 0 🔒 | Input editable (default 15s) | Button only | Manual | ✅ | ×0.5 |
| **Spectator** | Dropdown editable (default 0) | Input editable (default 10s) | Button or timer end | Manual | ✅ | ×0 |
| **Hardcore** | Forced 10s 🔒 | Forced 5s 🔒 | Timer end only | Auto | ❌ | ×2 |
| **Custom** | Dropdown free (default 15s) | Input free (default 10s) | Button | Manual | ✅ | ×1 |

**Rules:**
- `timerSeconds = 0` → no timer
- Locked fields are shown `disabled` with their imposed value
- Auto-play of clips is always active
- **Custom** mode unlocks the "Additional options" section

---

### Timer dropdown

Values: `No timer (0)` | `5 sec` | `10 sec` | `15 sec` | `20 sec` | `25 sec` | `30 sec`

The key is the numeric value (`timerSeconds`). `0` = no timer.

---

### "Game options" section

#### Block 1 — Numeric parameters
Fields in flex, adapt to available width.

| Field | Condition | Constraints |
|---|---|---|
| Drops (1–4) | Save One only | Min 1, max 4 — hint: N+1 choices per round |
| Rounds (1–20) | Always | Min 1, max 20 |
| Timer | Always | Dropdown — `disabled` if Chill or Hardcore |
| Clip duration (1–15s) | Songs category | Number input — `disabled` if Hardcore |

#### Block 2 — 2-player mode
- Toggle "2-player mode" on the left + description
- Player 1 and Player 2 fields on the right
- Both inputs are `disabled` if 2-player mode is off
- If 2-player mode is on: both fields are **required**
- Empty pseudo → red error message below input + "Launch" button disabled

---

### "Additional options" section *(Custom mode only)*

Visible only when `gamePlayMode === 'custom'`.

Content in a single `ConfigCard`:

#### If category = Idols
- **Criterion** (`BadgeGroupControl`, single-select):
  All / Beauty / Personality / Voice / Performance / Leadership / Aegyo / Random
- **Roles** (`BadgeGroupControl`, **multi-select**): filtered based on selected criterion

#### If category = Songs
- **Song type** (`BadgeGroupControl`, single-select):
  All / Titles / B-sides / Debut songs

#### In all cases
- **Group selector** (in a separate `ConfigCard`)

---

### Criteria — Save One

| Criterion | Available roles |
|---|---|
| `all`, `beauty`, `personality`, `voice`, `aegyo`, `random` | All |
| `performance` | mainVocal, vocal, mainDancer, dancer, mainRapper, rapper |
| `leadership` | leader only |

Selected roles that become unavailable after a criterion change are **automatically removed** from the selection.

---

### BadgeGroupControl — roles (multi-select)

- Multi-select: clicking multiple roles adds them all to `roleFilters[]`
- Clicking an already selected role deselects it
- `roleFilters = []` → all roles (no filter)
- Roles unavailable for the current criterion are not shown
- Reusable in the Contributor for group members (optional `availableRoles` prop)

---

### Group selector

**Sort order**: alphabetical by `name`

**Filters applied as intersection (AND logic):**

| Filter | Type | Source |
|---|---|---|
| Text search | Input | Free text |
| Debut year | Select | Dynamic — years present in dataset |
| Label/Agency | Select | Dynamic — labels present in dataset |
| Generation | FilterBadgeGroupControl (single) | Dynamic — generations present in dataset |
| Category | FilterBadgeGroupControl (single) | Dynamic — categories present in dataset |

**Important:** dynamic filter values (years, labels, generations) are computed from **all groups**, not from filtered groups, to avoid distorting available options.

**Dual-list:**
- Single click → highlight
- Double-click → immediate transfer
- `»` `›` `‹` `«` → transfer with/without prior selection
- Fixed height 240px + vertical scroll

**Row badges:**
- `SUB` (amber) → `parentGroupId` defined
- `SOLO` (purple) → `femaleSoloist` or `maleSoloist`

---

### "Launch game" button

Disabled if:
- 2-player mode is active with an empty player name
- Custom mode with no group selected

In all other cases: always active (plays with all available groups).

---

### GameConfig

```ts
interface GameConfig {
  mode:             'saveOne' | 'blindTest'
  gamePlayMode:     'classic' | 'chill' | 'spectator' | 'hardcore' | 'custom'
  category:         'idols' | 'songs'
  rounds:           number           // 1–20
  timerSeconds:     number           // 0 = no timer
  clipDuration:     number           // 1–15
  drops:            number           // 1–4 (Save One only)
  criterion:        SaveOneCriterion // used in Custom mode + idols
  roleFilters:      MemberRole[]     // [] = all — multi-select
  songType:         'all' | 'titles' | 'bSides' | 'debutSongs'
  twoPlayerMode:    boolean
  player1Name:      string
  player2Name:      string
  selectedGroupIds: string[]         // used in Custom mode
}
```

**Note:** `criterion`, `roleFilters`, `songType`, `selectedGroupIds` are kept in memory outside Custom mode but ignored by the game engine.
