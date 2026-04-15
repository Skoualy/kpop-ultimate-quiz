# SaveOne — Spécifications fonctionnelles & techniques

---

## 1. Vue d'ensemble

Mode de jeu disponible pour deux catégories : **Idoles** et **Chansons**.
Compatible **1 joueur** et **2 joueurs**.
L'UI doit tenir sur un écran 16:9 standard sans scroll. Responsive smartphone requis.

---

## 2. Règles générales

- Nombre de choix par round = `dropCount + 1`
- Un clic sur un choix valide immédiatement le round
- Tous les items affichés dans un round sortent du pool à la fin du round, **y compris l'item choisi**
- Recyclage autorisé uniquement après épuisement total du pool
- Pas de score : afficher uniquement un indicateur de progression **choix effectués / nombre total de rounds**

---

## 3. Pool — Idoles

- Unicité par `idol.id` — une idole n'apparaît qu'une seule fois dans le pool, même si plusieurs groupes liés sont sélectionnés
- Recyclage autorisé après épuisement complet
- Éviter autant que possible deux idoles du même groupe dans un même round
- Si le nombre de groupes le permet : idéalement un groupe différent par choix dans un round
- Si moins de groupes que de choix par round : équilibrer les apparitions entre rounds

---

## 4. Save One — Idoles

### Déroulé

- Affichage d'une `IdolCard` par choix
- Contenu minimal d'une card :
  - Portrait
  - Nom de scène
  - Groupe principal
  - Mention "Ancien membre" si applicable
- Le timer démarre dès que le round est entièrement affiché
- Clic sur une card = validation immédiate

### Timeout

- Auto-pass si timer épuisé
- Round marqué "passé par timeout"
- Aucune pénalité

---

## 5. Pool — Chansons

- Mêmes règles de sortie de pool que pour les idoles
- Éviter les doublons de groupe dans un même round
- Équilibrer les apparitions des groupes entre rounds
- Recyclage après épuisement uniquement

---

## 6. Save One — Chansons : déroulé exact

### Séquence initiale (obligatoire, non interruptible)

1. Lancement automatique du premier extrait dans l'iframe YouTube
2. Le nom de la musique en cours est affiché au-dessus de l'iframe
3. L'interface YouTube est masquée autant que possible (seul l'extrait est visible)
4. Sous l'iframe : les miniatures des chansons du round sont affichées
   - Seule la **première miniature est révélée** au départ
   - Les autres sont **masquées** (placeholder icône musicale)
   - Les boutons "Rejouer" sont visibles mais **désactivés** pendant la séquence
5. Chaque miniature se révèle après lecture complète de son extrait
6. Les extraits s'enchaînent automatiquement

### Une fois tous les extraits joués

- Toutes les miniatures sont révélées
- Tous les boutons "Rejouer" deviennent actifs
- Le timer démarre (si activé)
- Le joueur peut rejouer n'importe quel extrait déjà révélé
- **Cliquer sur une miniature valide immédiatement le choix**

### Contraintes

- Tous les extraits ont la même durée (`clipDuration` définie en config)
- Aucun replay possible pendant la séquence initiale
- Un compteur `N / total` est affiché pendant la lecture séquentielle

---

## 7. Timestamps des extraits

- Les extraits ne démarrent jamais systématiquement au début
- Pour chaque chanson, 3 timestamps candidats calculés sur la durée de référence :
  - `1/3`
  - `1/2`
  - `2/3`
- Un timestamp est choisi aléatoirement parmi les 3 pour chaque round
- Si la durée réelle de la vidéo est irrécupérable → durée par défaut : **180 secondes**
- Marges de sécurité appliquées :
  - Éviter les intros sans musique (décalage minimum depuis le début)
  - Éviter les fins avec silence/crédits/outro (décalage maximum avant la fin)
  - Le timestamp doit toujours laisser suffisamment de temps pour lire l'extrait complet
- Si le timestamp calculé sort de la zone jouable → recalage automatique dans la zone valide

---

## 8. Mode 2 joueurs

### Déroulé par round

1. Joueur 1 joue le round normalement
2. Transition fluide vers Joueur 2 (voir §9)
3. Joueur 2 joue le **même round** :
   - **Idoles** : les cards sont réaffichées telles quelles, timer reset si activé
   - **Chansons** : miniatures restent révélées, pas de relance automatique des extraits, extraits disponibles via les boutons "Rejouer", timer reset si activé

### Affichage

- Indicateur du joueur actif visible en permanence
- Score affiché séparément pour chaque joueur si pertinent

---

## 9. Transition entre joueurs

- Overlay ou animation "Au tour de [Joueur 2]"
- Mini compte à rebours de 1 à 2 secondes
- Skippable par clic n'importe où sur l'écran

---

## 10. Transition entre rounds

- Transition légère et fluide entre rounds
- Pas de changement abrupt
- Durée courte pour maintenir le rythme

---

## 11. Résumé de fin — 1 joueur

Pour chaque round :
- Mini card idole si choix effectué, OU miniature de chanson si choix effectué
- Mention "Pass" ou "Timeout" si applicable

Statistiques affichées :
- Choix le plus rapide

Podium des groupes les plus choisis : **affiché uniquement si pertinent**
- Condition : au moins un groupe apparaît plusieurs fois, ET le classement apporte une information utile
- En cas d'égalité : tie-break par rapidité

---

## 12. Résumé de fin — 2 joueurs

- Comparatif visuel des choix des deux joueurs, round par round
- Mise en évidence des choix communs
- Pas de statistiques lourdes — rester concis

---

## 13. Contraintes UI / Responsive

- Tout tient sur un écran 16:9 sans scroll
- Responsive smartphone obligatoire
- `IdolCard` : taille cohérente et stable, padding autour du portrait, bordures visibles sur tous les côtés (pas seulement sous l'image)
- Miniatures chansons : taille cohérente et stable
- Iframe YouTube : ni trop grande ni trop petite, équilibrée avec les miniatures
- Lisibilité et équilibre visuel garantis à toutes les tailles

---

## 14. Cas limites

| Cas | Comportement attendu |
|---|---|
| Pool insuffisant (moins d'items que de choix par round) | Avertissement ou désactivation du lancement |
| Recyclage après épuisement | Mélange aléatoire du pool initial, relance transparente |
| Timer désactivé (`timerSeconds = 0`) | Pas de décompte, round sans limite de temps |
| Timeout | Auto-pass, round marqué "timeout", aucune pénalité |
| Idole marquée ancien membre | Mention "Ancien membre" affichée sur la card |
| Même idole dans plusieurs groupes sélectionnés | Dédupliquée par `idol.id`, apparaît une seule fois dans le pool |
| Vidéo indisponible ou lecture impossible | Placeholder affiché, bouton "Rejouer" désactivé pour cette chanson, round jouable |
| Groupe surreprésenté si peu de groupes sélectionnés | Équilibrage entre rounds ; prévenir sans bloquer |
| Podium sans information utile (tous groupes distincts, 1 apparition chacun) | Podium non affiché |
| Deux joueurs, chansons : extraits déjà joués | Pas de relance automatique pour J2 ; uniquement via "Rejouer" |

---

## 15. Spec technique

### Types

```ts
interface SaveOneRound {
  items:       IdolItem[] | SongItem[]   // dropCount + 1 items
  chosenId:    string | null             // null = pass ou timeout
  isTimeout:   boolean
  timeMs:      number | null             // temps de réponse en ms
  playerIndex: 0 | 1                    // 0 = J1, 1 = J2
}

interface IdolItem {
  idolId:       string
  name:         string
  groupName:    string
  portrait:     string
  isFormer:     boolean
}

interface SongItem {
  songId:       string
  title:        string
  groupName:    string
  youtubeId:    string
  thumbnailUrl: string
  startTime:    number   // timestamp calculé en secondes
}
```

### Calcul des timestamps

```ts
function computeStartTime(
  duration: number,         // durée réelle ou 180 par défaut
  clipDuration: number,     // durée de l'extrait en config
  introMargin = 15,         // secondes évitées en début
  outroMargin = 20          // secondes évitées en fin
): number {
  const playable = duration - introMargin - outroMargin - clipDuration
  if (playable <= 0) return introMargin
  const candidates = [1/3, 1/2, 2/3].map(r => introMargin + Math.floor(r * playable))
  return candidates[Math.floor(Math.random() * 3)]
}
```

### Construction du pool

```ts
function buildIdolPool(
  groups: Group[],
  idols: Idol[],
  filters: { roleFilters: MemberRole[]; criterion: SaveOneCriterion }
): IdolItem[]
// - Déduplique par idol.id
// - Filtre par rôle si roleFilters non vide
// - Mélange aléatoire

function buildSongPool(
  groups: Group[],
  songs: Song[],
  filters: { songType: SongType }
): SongItem[]
// - Filtre par type
// - Calcule startTime pour chaque chanson
// - Mélange aléatoire
```

### Construction des rounds

```ts
function buildRounds(
  pool: (IdolItem | SongItem)[],
  config: { rounds: number; dropCount: number }
): Round[]
// - dropCount + 1 items par round
// - Équilibrage des groupes dans chaque round
// - Si pool épuisé avant la fin : recyclage avec re-mélange
```

---

## 16. Composants frontend suggérés

| Composant | Responsabilité |
|---|---|
| `SaveOnePage` | Orchestration globale, état de jeu, gestion pool |
| `SaveOneRoundIdols` | Affichage d'un round idoles (cards + timer) |
| `SaveOneRoundSongs` | Affichage d'un round chansons (iframe + miniatures + séquence) |
| `IdolCard` | Card idole pure (portrait, nom, groupe, badge ancien membre) |
| `SongThumbnail` | Miniature chanson (image, titre, groupe, bouton Rejouer) |
| `YouTubePlayer` | Wrapper iframe YouTube avec masquage UI et contrôle start/stop |
| `RoundProgressBar` | Barre de progression rounds (N / total) |
| `TimerBar` | Barre de timer animée |
| `PlayerTransitionOverlay` | Overlay "Au tour de [Joueur X]" avec compte à rebours |
| `RoundTransition` | Animation légère inter-rounds |
| `SaveOneSummary` | Résumé fin de partie (solo ou 2J) |
| `useIdolPool` | Hook construction + gestion pool idoles |
| `useSongPool` | Hook construction + gestion pool chansons |
| `useGameTimer` | Hook timer par round avec callback timeout |
| `computeTimestamp` | Utilitaire pur calcul timestamp extrait |
