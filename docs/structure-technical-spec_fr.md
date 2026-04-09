# Structure des données — spécification technique (React / TypeScript)

Ce document formalise la structure cible du dataset et du contributor pour la migration vers React / TypeScript.

Il couvre :

- les types attendus
- les champs obligatoires / optionnels
- les règles de validation
- les conventions de nommage
- les contraintes contributor
- les usages techniques liés au gameplay
- la structure cible des assets et du dataset
- l'architecture frontend cible
- une mini-roadmap de déploiement sur Raspberry Pi 4

---

## 1. Principes d'architecture

### Source de vérité

- **Index des groupes** : `dataset/groups/index.json`
- **Groupes** : un fichier JSON par groupe dans `dataset/groups/{GroupCategory}/{groupId}.json`
- **Idoles** : un fichier global unique dans `dataset/idols.json`
- **Labels / agences** : un fichier global unique dans `dataset/labels.json`
- **Appartenance d'une idole à un groupe** : stockée dans `group.members[]`

### Chargement des groupes

Le chargement des groupes se fait en deux temps :

1. lecture de `dataset/groups/index.json`
2. chargement du fichier détaillé via le couple `{category, id}`

Exemple :

- entrée index : `{ "id": "twice", "category": "girlGroup" }`
- fichier détaillé : `dataset/groups/girlGroup/twice.json`

### Règles structurantes

- une **idole** représente une **personne unique**
- un **groupe** représente une **entité jouable / discographique**
- une **sub-unit** est un **groupe** avec un `parentGroupId`
- un **soloist** est aussi un **groupe**
- `primaryGroupId` sur l'idole est un **groupe de référence** pour l'affichage, la désambiguïsation et certains arbitrages gameplay
- `gender` sur l'idole est un **champ dérivé persisté**, jamais saisi manuellement

### Convention de nommage

- `kebab-case` pour les scripts Python, les fichiers JSON, les assets, les fichiers Markdown et les fichiers techniques génériques
- `camelCase` pour les variables, fonctions, constantes locales, champs et valeurs d'enums
- `PascalCase` pour les composants React, interfaces, types, classes et les fichiers liés directement à un composant ou à un modèle nommé
- `UPPER_SNAKE_CASE` pour les constantes globales partagées et les configurations statiques
- `PascalCase + .types` pour les fichiers de types / props / state des composants React
- `PascalCase + .service` pour les services liés à un composant React
- `PascalCase` pour les dossiers dédiés à un composant React

---

## 2. Enums de référence

## `GroupCategory`

```ts
export type GroupCategory = 'girlGroup' | 'boyGroup' | 'femaleSoloist' | 'maleSoloist'
```

## `GroupStatus`

```ts
export type GroupStatus = 'active' | 'inactive'
```

## `MemberStatus`

```ts
export type MemberStatus = 'current' | 'former'
```

## `IdolGender`

```ts
export type IdolGender = 'f' | 'm'
```

## `Generation`

```ts
export type Generation = '1' | '2' | '3' | '4' | '5'
```

## `NationalityCode`

```ts
export type NationalityCode = 'kr' | 'jp' | 'cn' | 'tw' | 'th' | 'us' | 'au'
```

## `LanguageCode`

```ts
export type LanguageCode = 'jp' | 'en'
```

> Le coréen est implicite et n'est pas stocké dans `language`. Le champ `language` reste valide dans la spec. Le dataset de développement initial ne l'utilise pas encore car il repart de zéro avec des données saines — il sera utilisé dès qu'une chanson JP ou EN sera ajoutée.

## `LabelCountryCode`

```ts
export type LabelCountryCode = 'kr' | 'jp' | 'us' | 'cn' | 'tw' | 'th' | 'au'
```

## `MemberRole`

```ts
export type MemberRole =
  | 'leader'
  | 'mainVocal'
  | 'vocal'
  | 'mainDancer'
  | 'dancer'
  | 'mainRapper'
  | 'rapper'
  | 'visual'
  | 'maknae'
```

## `SaveOneCriterion`

```ts
export type SaveOneCriterion = 'all' | 'beauty' | 'personality' | 'voice' | 'performance' | 'leadership' | 'random'
```

## `PerformanceRole`

```ts
export type PerformanceRole = 'mainVocal' | 'vocal' | 'mainDancer' | 'dancer' | 'mainRapper' | 'rapper'
```

---

## 3. Type `Idol`

```ts
export interface Idol {
  id: string
  name: string
  primaryGroupId: string
  gender: IdolGender
  nationality: NationalityCode
  portrait?: string | null
  notes?: string | null
}
```

### Champ par champ

#### `id`

- type : `string`
- obligatoire : **oui**
- exemple : `sana`, `yooa`, `yubin`, `yubin-2`
- généré : **oui**
- éditable manuellement : **non recommandé**
- règle : slug du nom de scène, avec suffixe incrémental si collision
- validation :
  - unique dans `idols.json`
  - minuscule
  - caractères recommandés : `[a-z0-9-]`

#### `name`

- type : `string`
- obligatoire : **oui**
- validation : non vide, trim automatique

#### `primaryGroupId`

- type : `string`
- obligatoire : **oui**
- généré : **oui**, à la création initiale depuis le groupe courant
- rôle :
  - groupe de référence
  - affichage principal
  - désambiguïsation des homonymes
  - arbitrage Save One / pool final
  - préfiltrage contributor
- validation : doit référencer un groupe existant
- note : ne représente **pas** toutes les appartenances réelles

#### `gender`

- type : `"f" | "m"`
- obligatoire : **oui**
- saisi manuellement : **non**
- calculé : **oui**
- mapping :
  - `girlGroup` → `f`
  - `femaleSoloist` → `f`
  - `boyGroup` → `m`
  - `maleSoloist` → `m`
- validation : doit être recalculé au merge si `primaryGroupId` change

#### `nationality`

- type : `NationalityCode`
- obligatoire : **oui**
- valeur par défaut : `kr`

#### `portrait`

- type : `string | null`
- obligatoire : non
- valeur par défaut : `null`
- format recommandé : `webp`
- dimension cible : `400x533`
- convention recommandée : `assets/idols/{idolId}/portrait.webp`
- si absent ou null, l'UI doit afficher un placeholder de genre :
  - `assets/placeholders/idol-female.webp`
  - `assets/placeholders/idol-male.webp`

#### `notes`

- type : `string | null`
- obligatoire : non
- valeur par défaut : `null`

---

## 3.1 Type `Label`

```ts
export interface Label {
  id: string
  name: string
  country: LabelCountryCode
  logo?: string | null
}
```

### Champ par champ

#### `id`

- type : string
- obligatoire : oui
- généré : oui
- règle : slug du nom du label
- validation :
  - unique dans labels.json
  - minuscule
  - caractères recommandés : [a-z0-9-]

#### `name`

- type : string
- obligatoire : oui
- validation : non vide, trim automatique

#### `country`

- type : LabelCountryCode
- obligatoire : oui
- valeur recommandée par défaut : kr

#### `logo`

- type : string | null
- obligatoire : non
- valeur par défaut : null
- convention recommandée : assets/labels/{labelId}/logo.webp

## 4. Type `GroupMember`

```ts
export interface GroupMember {
  idolId: string
  status: MemberStatus
  roles: MemberRole[]
}
```

### Champ par champ

#### `idolId`

- type : `string`
- obligatoire : **oui**
- validation :
  - doit exister dans `idols.json`
  - un même `idolId` ne doit apparaître qu'une seule fois dans `group.members[]`

#### `status`

- type : `"current" | "former"`
- obligatoire : **oui**
- UI recommandée : checkbox "Ancien membre" mappée vers `current` / `former`

#### `roles`

- type : `MemberRole[]`
- obligatoire : **oui**
- cardinalité : plusieurs rôles autorisés
- validation :
  - uniquement des valeurs de `MemberRole`
  - pas de doublon
  - au moins un rôle
- note technique : ce champ est volontairement obligatoire car il alimente directement plusieurs mécaniques de jeu et filtres.

### Logique gameplay liée aux rôles

Les rôles ne sont pas uniquement descriptifs. Ils servent au moteur de jeu.

- `performance` compare de préférence des idoles partageant des rôles orientés chant, danse ou rap.
- rôles concernés pour `performance` : `mainVocal`, `vocal`, `mainDancer`, `dancer`, `mainRapper`, `rapper`
- `leadership` ne s'applique qu'aux idoles ayant le rôle `leader`
- `beauty`, `personality` et `voice` ne nécessitent pas de filtrage strict par rôle
- `visual` reste un rôle dataset valide, mais ne doit pas être confondu avec le critère gameplay `beauty`

---

## 5. Type `SongEntry`

```ts
export interface SongEntry {
  id: string
  title: string
  youtubeUrl: string
  language?: LanguageCode
  isDebutSong?: boolean
}
```

### Champ par champ

#### `id`

- type : `string`
- obligatoire : **oui**
- généré : **oui**
- éditable manuellement : **non recommandé**
- règle :
  - slug du titre
  - suffixe de langue uniquement si variante non coréenne
  - exemples : `dolphin`, `dolphin-jp`, `the-feels-en`
  - suffixe incrémental si collision
- validation :
  - unique dans toute la discography du groupe (`titles` + `bSides`)
  - minuscule
  - caractères recommandés : `[a-z0-9-]`

#### `title`

- type : `string`
- obligatoire : **oui**
- validation : non vide

#### `youtubeUrl`

- type : `string`
- obligatoire : **oui**
- validation : URL valide

#### `language`

- type : `LanguageCode`
- obligatoire : **non**
- valeur implicite : `kr` si absent
- usage : uniquement pour les variantes officielles non coréennes prises en charge
- v1 : `jp` et `en` uniquement
- règle métier :
  - une chanson mixte coréen / anglais reste considérée coréenne
  - une chanson mixte japonais / anglais reste considérée japonaise
- statut dataset dev : le dataset de développement initial n'utilise pas encore ce champ. Il sera utilisé dès qu'une chanson JP ou EN sera ajoutée proprement.

#### `isDebutSong`

- type : `boolean`
- obligatoire : non

> Le noyau v1 reste volontairement simple. Des champs futurs (`aliases`, `clipStart`, etc.) pourront être ajoutés sans casser la structure.

---

## 6. Type `Discography`

```ts
export interface Discography {
  titles: SongEntry[]
  bSides: SongEntry[]
}
```

### Règles

- obligatoire sur chaque groupe : **oui**
- champs obligatoires : `titles
- une même chanson ne doit pas apparaître à la fois dans `titles` et `bSides`
- les doublons sont évalués sur l'identifiant canonique de chanson (`SongEntry.id`)
- valeurs par défaut : []

```ts
const emptyDiscography: Discography = {
  titles: [],
  bSides: [],
}
```

- pas de champ `solos`
- pas d'exception structurelle pour les soloists

---

## 7. Type `Group`

```ts
export interface Group {
  id: string
  name: string
  category: GroupCategory
  parentGroupId: string | null
  generation: Generation
  debutYear: number
  status: GroupStatus
  company: string
  coverImage?: string | null
  members: GroupMember[]
  discography: Discography
  fandomName?: string | null
  notes?: string | null
}
```

### Champ par champ

#### `id`

- type : `string`
- obligatoire : **oui**
- exemple : `twice`, `misamo`, `iu`
- validation : unique, slug stable

#### `name`

- type : `string`
- obligatoire : **oui**

#### `category`

- type : `GroupCategory`
- obligatoire : **oui**
- validation : enum stricte
- règle sub-unit : si `parentGroupId !== null`, la catégorie doit être identique à celle du groupe parent

#### `parentGroupId`

- type : `string | null`
- obligatoire : **oui**
- valeur par défaut : `null`
- validation :
  - si non nul, doit référencer un groupe existant
  - le parent ne doit pas être lui-même le groupe courant
  - seuls des groupes de catégorie `girlGroup` ou `boyGroup` peuvent être parents
  - un groupe ayant déjà un `parentGroupId` ne peut pas être utilisé comme parent
  - un soloist ne peut jamais être proposé comme parent
- règle UI contributor :
  - champ optionnel avec autosuggestion
  - l'autosuggestion ne doit afficher que les groupes top-level de catégorie `girlGroup` ou `boyGroup`
  - texte d'aide recommandé : "À renseigner uniquement si ce groupe est une sub-unit d'un autre groupe."

#### `generation`

- type : `Generation`
- obligatoire : **oui**
- règle : auto-suggérée depuis `debutYear`, mais modifiable manuellement

#### `debutYear`

- type : `number`
- obligatoire : **oui**
- validation : entier à 4 chiffres

#### `status`

- type : `GroupStatus`
- obligatoire : **oui**
- valeur recommandée : `active`

#### `company`

- type : `string`
- obligatoire : **oui**
- note : une seule valeur canonique en v1
- rôle : nom canonique de l'agence principale / label principal
- validation :
  - doit correspondre à une entrée existante dans `labels.json`
  - si elle n'existe pas encore, elle doit être ajoutée au moment du merge contributor

#### `coverImage`

- type : `string | null`
- obligatoire : non
- format recommandé : `webp`
- dimension cible : `600x600`
- convention recommandée : `assets/groups/{groupId}/cover.webp`

#### `members`

- type : `GroupMember[]`
- obligatoire : **oui**
- validation : ids uniques dans le groupe

#### `discography`

- type : `Discography`
- obligatoire : **oui**

#### `fandomName`

- type : `string | null`
- obligatoire : non

#### `notes`

- type : `string | null`
- obligatoire : non

---

## 8. Cas particuliers métier

### Groupe classique

- `parentGroupId = null`
- `category = girlGroup | boyGroup`

### Soloist pur

- `parentGroupId = null`
- `category = femaleSoloist | maleSoloist`
- `members.length` recommandé : `1`
- côté contributor UI, les rôles exposés sont volontairement simplifiés à :
  - `vocal`
  - `rapper`
- à l'export / merge :
  - `vocal` implique aussi `mainVocal`
  - `rapper` implique aussi `mainRapper`

### Soloist issu d'un groupe

- même structure qu'un soloist pur
- l'idole doit être **réutilisée**, jamais dupliquée

### Sub-unit

- `parentGroupId !== null`
- `category` forcée à celle du parent
- les membres doivent être choisis parmi les membres du parent côté contributor
- les idoles sont **réutilisées**, jamais dupliquées
- côté contributor UI, les rôles ne sont pas saisis localement pour une sub-unit
- les rôles sont hérités depuis le groupe parent
- le dataset final doit tout de même contenir des `roles` complets sur chaque `GroupMember`
- ces rôles hérités peuvent être matérialisés soit :
  - au moment de l'export contributor
  - soit au moment du merge Python
- le résultat final doit rester conforme au type `GroupMember`

### Nouveau groupe composé d'anciennes membres d'un autre groupe

- ce n'est **pas** une sub-unit si le groupe est autonome
- `parentGroupId = null`
- les idoles existantes sont réutilisées si nécessaire

---

## 9. Contributor / état UI / export

### Formulaire principal

Le point d'entrée principal reste le **formulaire groupe**.

La section membres gère deux couches :

1. les infos propres à l'idole
2. les infos d'appartenance au groupe

### État UI recommandé pour un membre

```ts
export interface EditableMemberRow {
  idol: {
    id?: string
    name: string
    primaryGroupId?: string
    nationality: NationalityCode
    portrait?: string | null
    notes?: string | null
  }
  membership: {
    status: MemberStatus
    roles: MemberRole[]
  }
  idolResolution: {
    mode: 'existing' | 'new'
    selectedExistingId?: string | null
    resolvedId?: string | null
  }
}
```

> `idolResolution` est un objet temporaire côté UI. Il ne fait pas partie du dataset final.

### Détection de doublon idole

Quand un nom est saisi :

1. génération d'un slug de base
2. recherche des idoles existantes sur cette base (`yubin`, `yubin-2`, etc.)
3. affichage d'un bloc si collision détectée
4. l'utilisateur choisit une idole existante ou "non, c'est un autre artiste"
5. si nouvelle idole distincte : génération du prochain id libre

### Préfiltrage par catégorie / gender

Lorsqu'on rattache une idole existante à un groupe :

- on déduit le `gender` attendu depuis `group.category`
- on filtre en priorité les idoles ayant le même `gender`

Dans le contributor, le placeholder portrait d’un membre est déterminé depuis la catégorie effective du groupe en cours :

- `girlGroup` / `femaleSoloist` → `assets/placeholders/idol-female.webp`
- `boyGroup` / `maleSoloist` → `assets/placeholders/idol-male.webp`

Cette logique réutilise le même principe de dérivation que pour `gender` sur l’idole.

### Gestion des sub-units dans le contributor

- le formulaire expose directement `parentGroupId`
- si `parentGroupId` est renseigné, le groupe est considéré comme une sub-unit
- la catégorie est forcée depuis le parent
- la sélection de membres existants est limitée aux membres du parent

### Réinitialisation structurelle du contributor

Certains changements structurels peuvent invalider l'état déjà saisi dans la section membres.

Exemples :

- changement de `category`
- changement de `parentGroupId`
- passage d'un groupe classique vers un soloist
- passage d'une sub-unit vers un groupe indépendant

Règle recommandée :

- le contributor doit demander confirmation à l'utilisateur
- si l'utilisateur confirme, les membres déjà saisis sont réinitialisés pour éviter les incohérences métier

### Contributor — règles spécifiques sur les membres

#### Groupe classique

- ajout / suppression libre de membres
- rôles saisis localement

#### Soloist

- une seule carte membre côté UI
- pas de suppression de la carte
- un bouton `reset` remet la carte à l'état vide
- utile notamment si une idole existante a été réutilisée par erreur

#### Sub-unit

- sélection des membres via la liste des membres du parent
- pas de saisie locale des rôles
- la nationalité peut rester visible en lecture / rappel
- les portraits hérités peuvent être affichés comme non éditables si souhaité par l'UI

---

## 10. Bundle de contribution

Le contributor n'exporte pas directement les fichiers finaux.
Il exporte un **bundle de contribution** ensuite fusionné par Python.

### Type recommandé

```ts
export interface ContributionBundleMeta {
  schemaVersion: number
  generatedAt: string
}

export interface ContributionBundle {
  meta: ContributionBundleMeta
  group: Group
  idols: Idol[]
  labels?: Label[]
}
```

### Exemple

```json
{
  "meta": {
    "schemaVersion": 1,
    "generatedAt": "2026-03-27T12:00:00Z"
  },
  "group": {
    "id": "twice",
    "name": "TWICE",
    "category": "girlGroup",
    "parentGroupId": null,
    "generation": "3",
    "debutYear": 2015,
    "status": "active",
    "company": "JYP Entertainment",
    "coverImage": "assets/groups/girlGroup/twice/cover.webp",
    "members": [
      { "idolId": "jihyo", "status": "current", "roles": ["leader", "mainVocal"] },
      { "idolId": "sana", "status": "current", "roles": ["vocal", "dancer"] }
    ],
    "discography": {
      "titles": [
        {
          "id": "like-oooh-ahh",
          "title": "Like OOH-AHH",
          "youtubeUrl": "https://www.youtube.com/watch?v=0rtV5esQT6I",
          "isDebutSong": true
        }
      ],
      "bSides": []
    },
    "fandomName": "ONCE",
    "notes": null
  },
  "idols": [
    {
      "id": "jihyo",
      "name": "Jihyo",
      "primaryGroupId": "twice",
      "gender": "f",
      "nationality": "kr",
      "portrait": "assets/idols/jihyo/portrait.webp",
      "notes": null
    }
  ]
}
```

### Règle sur les labels dans le bundle

Le bundle peut inclure un tableau `labels` optionnel.

Usage recommandé :

- inclure uniquement les nouveaux labels détectés par le contributor
- éviter de réexporter tous les labels existants du dataset

---

## 11. Structure cible des assets

```text
assets/
├── groups/
│   └── {groupId}/
│       └── cover.webp
├── idols/
│   └── {idolId}/
│       └── portrait.webp
├── labels/
│   └── {labelId}/
│       └── logo.webp
└── placeholders/
    ├── group-cover.webp
    ├── idol-female.webp
    └── idol-male.webp
```

### Règles

- tous les noms de dossiers et fichiers doivent respecter les conventions de nommage définies plus haut
- format image recommandé : `webp`
- les placeholders sont partagés et stables

### Règles de fallback visuel

Lorsqu'une image réelle n'est pas disponible, l'application doit utiliser les placeholders dédiés :

- **groupe** :
  - fallback : `assets/placeholders/group-cover.webp`
- **idole d'un groupe ou soloist féminin** :
  - fallback : `assets/placeholders/idol-female.webp`
- **idole d'un groupe ou soloist masculin** :
  - fallback : `assets/placeholders/idol-male.webp`

### Règles de résolution

#### Cover de groupe

- si `group.coverImage` est défini et valide, l'utiliser
- sinon utiliser `assets/placeholders/group-cover.webp`

#### Portrait d'idole

- si `idol.portrait` est défini et valide, l'utiliser
- sinon choisir le placeholder selon le genre dérivé de l'idole :
  - `f` → `assets/placeholders/idol-female.webp`
  - `m` → `assets/placeholders/idol-male.webp`

### Règle contributor

Dans le contributor, l'absence d'image ne bloque pas l'export.
Le dataset peut contenir `null` pour `coverImage` ou `portrait`, et l'application se charge d'afficher le placeholder approprié côté UI.

---

## 12. Règles de merge Python

Le merge Python doit :

- valider le bundle
- recalculer `gender` si nécessaire
- ajouter / mettre à jour les idoles dans `dataset/idols.json`
- ajouter / mettre à jour les labels dans `dataset/labels.json`
- créer une entrée label si `group.company` ne correspond à aucun label existant
- écrire / mettre à jour le groupe dans `dataset/groups/{GroupCategory}/{groupId}.json`
- maintenir / regénérer `dataset/groups/index.json`
- empêcher la duplication d'idoles déjà existantes
- rejeter les références invalides (`parentGroupId`, `idolId`, enums, collisions incohérentes)
- vérifier que `group.company` correspond à un label existant ou à un label fourni/créé
- vérifier la cohérence entre `dataset/groups/index.json` et les fichiers détaillés de groupes

### Déduplication gameplay

Si une même idole est présente dans plusieurs groupes, l'application doit la considérer comme **une seule personne** côté logique gameplay lorsque cela a du sens.

---

## 13. Mini-roadmap de déploiement serveur (Raspberry Pi 4)

La cible de déploiement n'est plus Electron. La cible principale est une application web servie depuis un Raspberry Pi 4.

### Étapes recommandées

1. **Build frontend React**
   - produire un build statique (`dist/`)
2. **Service local sur le Pi 4**
   - exposer le frontend via Nginx
3. **Reverse proxy**
   - utiliser Nginx ou Nginx Proxy Manager
   - gérer HTTPS via Let's Encrypt
4. **Stockage**
   - conserver dataset, assets et exports contributor dans un volume persistant
5. **Sécurité minimale**
   - limiter l'accès admin
   - sauvegarder régulièrement le dataset et les assets
6. **Évolutions ultérieures**
   - profils, XP, collections de cartes, outils de modération

### Arborescence de déploiement indicative

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

## 14. Règles à retenir

- `parentGroupId` défini = sub-unit
- pas de `solos` dans `discography`
- `language` absent = coréen implicite
- `roles` obligatoires sur chaque `GroupMember`
- `idolResolution` est un objet UI temporaire, jamais persisté dans le dataset final
- les idoles sont des personnes uniques, réutilisées entre groupes quand c'est nécessaire
- `company` référence un label / agence principale unique
- les groupes sont indexés dans `dataset/groups/index.json`
- les fichiers groupes détaillés sont stockés dans `dataset/groups/{GroupCategory}/{groupId}.json`
- pour une sub-unit, les rôles sont hérités du parent et doivent être présents dans le dataset final
- pour un soloist, l'UI contributor expose `vocal` / `rapper`, mais l'export enrichit les rôles avec `mainVocal` / `mainRapper`
- `coverImage` ou `portrait` absents ne bloquent pas l'affichage : l'UI doit utiliser les placeholders dédiés

---

## 15. Architecture frontend — structure `src/`

### Arborescence cible

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
├── features/
│   ├── config/
│   │   ├── ConfigPage.tsx
│   │   ├── ConfigPage.types.ts
│   │   └── components/
│   │       ├── GameTypeSelector/
│   │       ├── GroupSelector/
│   │       └── GameSettings/
│   ├── groups/
│   │   ├── GroupsPage.tsx
│   │   ├── GroupsPage.types.ts
│   │   └── components/
│   │       └── GroupCard/
│   ├── contributor/
│   │   ├── ContributorPage.tsx
│   │   ├── ContributorPage.types.ts
│   │   └── components/
│   │       └── steps/
│   │           ├── GroupInfoStep/
│   │           ├── MembersStep/
│   │           ├── SongsStep/
│   │           └── ExportStep/
│   ├── blind-test/
│   │   ├── BlindTestPage.tsx
│   │   └── BlindTestPage.types.ts
│   └── save-one/
│       ├── SaveOnePage.tsx
│       └── SaveOnePage.types.ts
├── shared/
│   ├── components/
│   │   ├── AutoSuggest/
│   │   ├── Badge/
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── Input/
│   │   ├── Layout/
│   │   ├── LoadingSpinner/
│   │   ├── Modal/
│   │   └── Select/
│   ├── constants/
│   │   ├── categories.ts
│   │   ├── criteria.ts
│   │   ├── gameDefaults.ts
│   │   ├── generations.ts
│   │   ├── nationalities.ts
│   │   ├── roles.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useAsync.ts
│   │   ├── useGroupList.ts
│   │   └── useIdolPool.ts
│   ├── models/
│   │   ├── enums.ts
│   │   ├── Group.ts
│   │   ├── Idol.ts
│   │   ├── GroupMember.ts
│   │   ├── SongEntry.ts
│   │   ├── Discography.ts
│   │   ├── ContributionBundle.ts
│   │   ├── GameConfig.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── groupService.ts
│   │   ├── idolService.ts
│   │   └── gameService.ts
│   └── utils/
│       ├── youtube.ts
│       ├── slug.ts
│       └── index.ts
├── store/
│   ├── appStore.ts
│   └── gameStore.ts
└── styles/
    └── globals.scss
```

### Routes

| Route                   | Page              | Description                  |
| ----------------------- | ----------------- | ---------------------------- |
| `/`                     | `ConfigPage`      | Configuration d'une partie   |
| `/groups`               | `GroupsPage`      | Gestion des groupes          |
| `/contributor`          | `ContributorPage` | Création d'un nouveau groupe |
| `/contributor/:groupId` | `ContributorPage` | Édition d'un groupe existant |
| `/blind-test`           | `BlindTestPage`   | Partie Blind Test            |
| `/save-one`             | `SaveOnePage`     | Partie Save One              |

---

## 16. Conventions composants React

### Règle fondamentale

**Un fichier = un composant.**

### Structure d'un dossier composant

```text
ComponentName/
  ComponentName.tsx          ← composant React (named export)
  ComponentName.types.ts     ← Props, State, variantes internes
  ComponentName.module.scss  ← styles SCSS spécifiques (si nécessaire)
  index.ts                   ← barrel : export { ComponentName } from './ComponentName'
```

### Règles

- **PascalCase** pour le nom du dossier et du fichier composant
- **`.types.ts`** co-localisé dans le dossier du composant — obligatoire même si le composant n'a que des props simples
- **`.module.scss`** créé uniquement si des styles custom sont nécessaires (animations, pseudo-éléments, effets non couverts par Tailwind)
- **`index.ts`** obligatoire pour permettre les imports propres : `import { Button } from '@/shared/components/Button'`
- `named export` pour tous les composants partagés
- `default export` autorisé uniquement pour les pages (React Router)
- Les composants partagés vont dans `src/shared/components/`
- Les composants propres à une feature vont dans `features/{feature}/components/`

### Hooks custom

- Préfixe `use` obligatoire
- Hooks partagés dans `src/shared/hooks/`
- Hooks locaux à une feature co-localisés dans la feature

---

## 17. Composant `AutoSuggest<T>` générique

Le composant `AutoSuggest` est un champ texte avec liste de suggestions déroulante, générique et réutilisable dans toute la base de code.

### Interface Props

```ts
export interface AutoSuggestProps<T> {
  value: string
  onChange: (value: string) => void
  onSelect: (item: T) => void
  getSuggestions: (query: string) => T[]
  getLabel: (item: T) => string
  getKey: (item: T) => string
  placeholder?: string
  label?: string
  disabled?: boolean
  renderItem?: (item: T, isHighlighted: boolean) => React.ReactNode
}
```

### Usages prévus

- `parentGroupId` dans le contributor (suggestions : groupes top-level)
- `company` / label dans le contributor (suggestions : labels connus)
- Recherche d'idole existante dans le contributor (future)

---

## 18. Modèles TypeScript — dossier `models/`

### Structure

```text
src/shared/models/
  enums.ts              ← tous les types union (GroupCategory, MemberRole, etc.)
  Group.ts
  Idol.ts
  Label.ts
  GroupMember.ts
  SongEntry.ts
  Discography.ts
  ContributionBundle.ts
  GameConfig.ts
  index.ts              ← barrel export de tous les modèles
```

### Règles

- **Un fichier par interface ou type complexe**
- `enums.ts` centralise tous les types union simples
- `index.ts` ré-exporte tout : `export * from './Group'`, etc.
- Import depuis les composants : `import type { Group, Idol } from '@/shared/models'`
- **Aucune logique métier dans les fichiers de modèles — types uniquement**

---

## 19. Constantes — dossier `constants/`

### Structure

```text
src/shared/constants/
  roles.ts         ← ROLES, ROLE_LABELS, PERFORMANCE_ROLES
  criteria.ts      ← CRITERIA, CRITERIA_LABELS
  generations.ts   ← GENERATIONS, GENERATION_LABELS, DEBUT_YEAR_TO_GENERATION
  nationalities.ts ← NATIONALITIES, NATIONALITY_LABELS
  categories.ts    ← CATEGORIES, CATEGORY_LABELS, GENDER_BY_CATEGORY
  gameDefaults.ts  ← DEFAULT_GAME_CONFIG
  index.ts         ← barrel export
```

### Règles

- `UPPER_SNAKE_CASE` pour toutes les constantes
- Chaque fichier contient :
  - la liste des valeurs valides (array typé)
  - le mapping d'affichage associé (`Record<EnumValue, string>`)
  - les constantes dérivées si nécessaire
- **Aucune valeur technique ne doit être codée en dur dans un composant**
- Import : `import { ROLES, ROLE_LABELS } from '@/shared/constants'`

### Exemple (roles.ts)

```ts
import type { MemberRole } from '@/shared/models'

export const ROLES: MemberRole[] = [
  'leader',
  'mainVocal',
  'vocal',
  'mainDancer',
  'dancer',
  'mainRapper',
  'rapper',
  'visual',
  'maknae',
]

export const ROLE_LABELS: Record<MemberRole, string> = {
  leader: 'Leader',
  mainVocal: 'Main Vocal',
  vocal: 'Vocal',
  mainDancer: 'Main Dancer',
  dancer: 'Dancer',
  mainRapper: 'Main Rapper',
  rapper: 'Rapper',
  visual: 'Visual',
  maknae: 'Maknae',
}

export const PERFORMANCE_ROLES: MemberRole[] = ['mainVocal', 'vocal', 'mainDancer', 'dancer', 'mainRapper', 'rapper']
```

---

## 20. Services de données — data layer `fetch`

### Principe

Le dataset est servi comme fichiers statiques depuis `public/dataset/`.
Les services utilisent `fetch()` pour les récupérer.
Ce comportement est **identique en développement** (Vite sert `public/`) et **en production** (Nginx sert les fichiers statiques).
Aucun import statique Vite de fichiers JSON du dataset ne doit être utilisé pour les données dynamiques.

### Structure du dataset public

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

### Structure de `groups/index.json`

Le fichier `groups/index.json` contient une liste d'entrées minimales permettant de reconstruire le chemin de chaque groupe détaillé.

```ts
export interface GroupIndexEntry {
  id: string
  category: GroupCategory
}
```

### Interfaces de services

```ts
interface GroupService {
  getIndex(): Promise<GroupIndexEntry[]>
  getAll(): Promise<Group[]>
  getById(id: string): Promise<Group | null>
  getByCategory(category: GroupCategory): Promise<Group[]>
  getSubUnits(parentId: string): Promise<Group[]>
}

interface IdolService {
  getAll(): Promise<Idol[]>
  getByIds(ids: string[]): Promise<Idol[]>
  resolveMembers(group: Group, allIdols: Idol[]): Idol[]
}

interface LabelService {
  getAll(): Promise<Label[]>
  getByName(name: string): Promise<Label | null>
}

interface GameService {
  buildSongPool(groups: Group[]): SongWithGroup[]
  buildIdolPool(groups: Group[], allIdols: Idol[], config: GameConfig): IdolWithGroup[]
  shuffle<T>(arr: T[]): T[]
}
```

### Types dérivés gameplay recommandés

```ts
export interface SongWithGroup {
  song: SongEntry
  group: Group
}

export interface IdolWithGroup {
  idol: Idol
  group: Group
  membership: GroupMember
}
```

### Règles

- Toujours gérer les erreurs fetch (try/catch, retour null ou tableau vide)
- Les services sont des objets purs exportés directement : `export const groupService = { ... }`
- Pas de classes, pas de singletons avec état interne

---

## 21. Stores Zustand

NON UTILISE POUR LE MOMENT !

### `appStore`

Gère l'état global de l'application, non lié au gameplay.

```ts
interface AppState {
  theme: 'dark' | 'light'
  toggleTheme: () => void
}
```

Persisté dans `localStorage` via le middleware `persist` de Zustand.

### `gameStore`

Gère la configuration et l'état en cours de partie.

```ts
interface GameState {
  config: GameConfig | null
  phase: 'idle' | 'playing' | 'finished'
  currentRound: number
  score: number
  revealState: 'hidden' | 'revealed'
  eliminated: string[]
  setConfig: (config: GameConfig) => void
  startGame: () => void
  revealAnswer: () => void
  nextRound: () => void
  addPoint: () => void
  eliminate: (id: string) => void
  resetGame: () => void
}
```

### Règles

- Les stores sont dans `src/store/`
- Les stores ne contiennent pas de logique métier complexe (déléguée aux services)
- Les composants n'accèdent au store que via des sélecteurs : `useAppStore(s => s.theme)`
- Pas de souscription globale au store entier

---

## 22. Styles — Tailwind CSS + SCSS Modules

### Tailwind CSS

- Utilisé pour : layout, spacing, flexbox, grid, responsive, typographie de base
- Les couleurs du thème sont référencées via des variables CSS définies dans `globals.scss`
- Configuration dans `tailwind.config.ts` : extension via le préfixe `kq-`

### SCSS Modules

- Un fichier `.module.scss` par composant **uniquement si des styles custom sont nécessaires**
- Utilisés pour : animations custom, effets neon, pseudo-éléments complexes
- Import dans le composant : `import styles from './ComponentName.module.scss'`

### Variables CSS du thème (dark par défaut)

```scss
:root {
  --color-bg-base: #080d1a;
  --color-bg-surface: #0f1629;
  --color-bg-elevated: #161e35;
  --color-border: #1e2d52;
  --color-primary: #7c3aed;
  --color-primary-light: #a855f7;
  --color-accent: #ec4899;
  --color-accent-light: #f472b6;
  --color-text: #e2e8f0;
  --color-text-muted: #8892b0;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
}

[data-theme='light'] {
  --color-bg-base: #f5f7ff;
  --color-bg-surface: #ffffff;
  --color-bg-elevated: #eef1ff;
  --color-border: #d0d9f0;
  --color-text: #1a1f36;
  --color-text-muted: #4a5180;
}
```

### Classes Tailwind custom (préfixe `kq-`)

```
bg-kq-base        bg-kq-surface      bg-kq-elevated
text-kq-text      text-kq-muted
border-kq-border
bg-kq-primary     text-kq-primary    bg-kq-primary-soft
bg-kq-accent      text-kq-accent     bg-kq-accent-soft
text-kq-success   text-kq-warning    text-kq-danger
```

### Règle fondamentale

**Aucune couleur ou taille fixe ne doit être codée en dur dans un composant React** (ni en style inline, ni dans un className arbitraire hors thème). Utiliser exclusivement les classes Tailwind étendues ou les variables CSS.
