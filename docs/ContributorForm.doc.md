# ContributorForm — Spécifications techniques / Technical Specifications

---

## 🇫🇷 Français

### Vue d'ensemble

Le formulaire Contributor permet de créer ou modifier un groupe K-pop en 4 étapes séquentielles. Chaque étape doit être validée avant d'accéder à la suivante. En mode édition, toutes les étapes sont déverrouillées dès l'ouverture.

Les données saisies sont assemblées à l'export (étape 4) en un bundle JSON conforme à la spec v2 du dataset.

---

### Structure des étapes

| # | Onglet | Validation requise |
|---|---|---|
| 1 | Infos groupe | Nom, Année, Génération, Label |
| 2 | Membres | Au moins 1 membre actuel avec au moins 1 rôle |
| 3 | Musiques | Au moins 1 title track avec titre et URL YouTube |
| 4 | Export | Génération manuelle du JSON |

Navigation : bouton **Suivant →** (valide l'étape) ou clic sur un onglet déjà déverrouillé. Le bouton **← Retour** ne revalide pas.

---

### Onglet 1 — Infos groupe

Champs en grille 2 colonnes :

| Champ | Obligatoire | Comportement |
|---|---|---|
| Nom du groupe | ✅ | Auto-génère l'ID slug + détection collision en temps réel |
| Statut | ✅ | Select : Actif / Inactif |
| Catégorie | ✅ | Forcée depuis le groupe parent si sub-unit |
| Sub-unit de | ❌ | Désactivé si catégorie soloist — tri alphabétique |
| Année de début | ✅ | 1990–présent |
| Génération | ✅ | Auto-suggérée depuis l'année (badge "auto") — modifiable |
| Label / Agence | ✅ | Autocomplete sur les labels existants — nouveau label signalé |
| Nom de la fandom | ❌ | — |
| Cover du groupe | ❌ | `ImagePickerControl` — 600×600 px WebP |
| Notes | ❌ | Textarea libre |

**Règles métier :**
- Si un groupe parent est sélectionné → catégorie forcée + champ disabled
- Si catégorie = soloist → champ "Sub-unit de" disabled + reset automatique
- ID généré = slugify(nom) — affiché en suffix de l'input nom
- Collision d'ID → bordure rouge + message d'erreur + validation bloquée

---

### Onglet 2 — Membres

Deux sections :
- **Membres actuels** (au moins un requis)
- **Anciens membres** (optionnel) — masquée si sub-unit ou soloist

Chaque membre est affiché dans un `MemberCard` :

```
[🗑 Supprimer]
┌─────────────────────────┐  ┌──────────────┐
│ Nom de scène*  Nationnalité │  │  Portrait    │
│ Rôles* (BadgeGroup multi)   │  │  400×533     │
└─────────────────────────┘  └──────────────┘
```

**Champs :**
- Nom de scène (requis)
- Nationalité (`SelectNationalityControl` avec drapeaux)
- Rôles (`BadgeGroupControl`, isMultiselect, required=true) : Leader / Main Vocal / Vocal / Main Dancer / Dancer / Main Rapper / Rapper / Visual / Maknae
- Portrait (`ImagePickerControl`, 400×533, ratio 3:4)

**Champs déduits automatiquement (non affichés) :**
- `gender` → dérivé de la catégorie effective du groupe
- `status` → `"current"` ou `"former"` selon la section

---

### Onglet 3 — Musiques

Deux sections :
- **Title tracks** (au moins un requis)
- **B-sides** (optionnel) — masquée si sub-unit ou soloist

Chaque chanson est affichée dans un `SongInfoCard` :

```
[🗑 Supprimer]
┌──────────────────────────┐  ┌──────────────┐
│ Titre*     URL YouTube*  │  │  YouTubeFrame │
│ Langue     Toggle Début  │  │  miniature    │
└──────────────────────────┘  └──────────────┘
```

**Champs :**
- Titre (requis) — auto-génère l'ID slug
- URL YouTube (requis) — miniature affichée en temps réel via `YouTubeFrameControl`
- Langue (`SelectLanguageControl`) : 🇰🇷 Coréen (défaut) / 🇯🇵 Japonais / 🇺🇸 Anglais
- Toggle "Chanson de début" (titles uniquement) — **une seule possible** : cocher en décoche toutes les autres

---

### Onglet 4 — Export

- Bouton **⚡ Générer le JSON** → assemble le bundle en mémoire
- Zone textarea (lecture seule) — affiche le JSON généré
- **↓ Télécharger le JSON** → télécharge `{groupId}.json`
- **📋 Copier JSON** → copie dans le presse-papiers
- **✏️ Modifier** → retourne à l'étape 3

**Structure du bundle généré :**
```json
{
  "group": { /* Group complet */ },
  "idols": [ /* Idol[] avec gender déduit */ ]
}
```

---

### Composants utilisés

| Composant | Type | Usage |
|---|---|---|
| `BadgeGroupControl` | Control | Rôles membres (multi, required) |
| `ImagePickerControl` | Control | Cover groupe + portraits membres |
| `SelectNationalityControl` | Control | Nationalité membres |
| `SelectLanguageControl` | Control | Langue chansons |
| `YouTubeFrameControl` | Control | Miniature YouTube chansons |
| `ToggleControl` | Control | Toggle "Chanson de début" |
| `ContributorStep` | Component | Wrapper étape + affichage erreurs |

---

### Routes

```
/contributor              → création nouveau groupe
/contributor/:groupId     → édition groupe existant
```

---

---

## 🇬🇧 English

### Overview

The Contributor form allows creating or editing a K-pop group in 4 sequential steps. Each step must be validated before accessing the next. In edit mode, all steps are unlocked from the start.

The entered data is assembled on export (step 4) into a JSON bundle conforming to the v2 dataset spec.

---

### Step structure

| # | Tab | Required validation |
|---|---|---|
| 1 | Group info | Name, Year, Generation, Label |
| 2 | Members | At least 1 current member with at least 1 role |
| 3 | Music | At least 1 title track with title and YouTube URL |
| 4 | Export | Manual JSON generation |

Navigation: **Next →** button (validates the step) or click on an already unlocked tab. The **← Back** button does not re-validate.

---

### Tab 1 — Group info

Fields in 2-column grid:

| Field | Required | Behavior |
|---|---|---|
| Group name | ✅ | Auto-generates slug ID + real-time collision detection |
| Status | ✅ | Select: Active / Inactive |
| Category | ✅ | Forced from parent group if sub-unit |
| Sub-unit of | ❌ | Disabled if soloist category — alphabetically sorted |
| Debut year | ✅ | 1990–present |
| Generation | ✅ | Auto-suggested from year ("auto" badge) — editable |
| Label / Agency | ✅ | Autocomplete from existing labels — new label flagged |
| Fandom name | ❌ | — |
| Group cover | ❌ | `ImagePickerControl` — 600×600 px WebP |
| Notes | ❌ | Free textarea |

**Business rules:**
- If a parent group is selected → category forced + field disabled
- If category = soloist → "Sub-unit of" field disabled + auto-reset
- Generated ID = slugify(name) — shown as input suffix
- ID collision → red border + error message + validation blocked

---

### Tab 2 — Members

Two sections:
- **Current members** (at least one required)
- **Former members** (optional) — hidden if sub-unit or soloist

Each member is displayed in a `MemberCard`:

**Fields:**
- Stage name (required)
- Nationality (`SelectNationalityControl` with flags)
- Roles (`BadgeGroupControl`, isMultiselect, required=true)
- Portrait (`ImagePickerControl`, 400×533, 3:4 ratio)

**Auto-derived fields (not shown):**
- `gender` → derived from effective group category
- `status` → `"current"` or `"former"` based on section

---

### Tab 3 — Music

Two sections:
- **Title tracks** (at least one required)
- **B-sides** (optional) — hidden if sub-unit or soloist

Each song is displayed in a `SongInfoCard`:

**Fields:**
- Title (required) — auto-generates slug ID
- YouTube URL (required) — thumbnail shown in real time via `YouTubeFrameControl`
- Language (`SelectLanguageControl`): 🇰🇷 Korean (default) / 🇯🇵 Japanese / 🇺🇸 English
- "Debut song" toggle (titles only) — **only one allowed**: checking one unchecks all others

---

### Tab 4 — Export

- **⚡ Generate JSON** button → assembles the bundle in memory
- Read-only textarea → displays generated JSON
- **↓ Download JSON** → downloads `{groupId}.json`
- **📋 Copy JSON** → copies to clipboard
- **✏️ Edit** → returns to step 3

**Generated bundle structure:**
```json
{
  "group": { /* Complete Group */ },
  "idols": [ /* Idol[] with derived gender */ ]
}
```
