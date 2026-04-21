# 🎵 K-Pop Ultimate Quiz — Roadmap v0.6 → v1.0

> **Légende des statuts**
> `✅ Terminé` · `🔄 En cours` · `📋 Planifié` · `💡 Idée / à décider` · `❌ Abandonné`

---

## v0.6.0 — MVP React / TypeScript

> Objectif : poser l'architecture cible et stabiliser les fonctionnalités de base.

### ✅ Réalisé

- [x] Migration vers React 18 + TypeScript + Vite
- [x] Architecture features / shared / context
- [x] Dataset structuré (groupes, idoles, labels, discographie)
- [x] ConfigPage — configuration complète d'une partie (mode, catégorie, drops, rounds, timer, 2J, critère, rôles, groupes)
- [x] Save One — idoles (1J & 2J) avec pool, rounds, transitions, résumé
- [x] Save One — chansons (1J & 2J) avec séquence YouTube, replay, fade audio
- [x] Contributor — formulaire multi-étapes (infos groupe, membres, musiques, export)
- [x] GroupsPage — liste et gestion des groupes
- [x] Thème dark / light persisté
- [x] Pipeline Python de migration des données (v2)

---

## v0.6.1 — Correctifs Save One & système de crédits images *(version actuelle)*

> Objectif : stabiliser Save One, améliorer la config et poser le système de traçabilité des images.

### ✅ Save One — correctifs & polish

- [x] Transitions entre rounds et entre joueurs : composants de jeu démontés pendant les transitions → plus aucun son en arrière-plan
- [x] Songs : avancement des extraits via timer JS (`useEffect`) au lieu des events postMessage YT — fiable sur tous les navigateurs
- [x] Songs mode 2J : iframe figée sur le dernier extrait J1 (sans autoplay) au lieu d'un rechargement automatique
- [x] Songs : replay J1 fonctionnel via état `activeIdx` unifié
- [x] Songs : bouton "Passer cet extrait" pendant la séquence J1
- [x] Songs : fondu audio (fade via `setVolume` postMessage) entre extraits
- [x] Résumé 2J : deux colonnes côte-à-côte (J1 / J2) avec stats par joueur (choix le plus rapide, groupes favoris)
- [x] ScrollTopControl : apparaît uniquement après scroll (seuil 150px)
- [x] Badge critère centré au-dessus des cards idoles
- [x] Badge nom du joueur (violet J1 / rose J2) au-dessus des cards et des miniatures chansons
- [x] TimerBar redesignée : plus haute, label lisible, couleur vert → orange → rouge selon le temps restant
- [x] Badge "Ancien membre" : style neutre sans icône warning
- [x] Header Save One unifié : round, infos mode et bouton Passer dans une seule barre centrée

### ✅ Config — correctifs

- [x] Critère "Leadership" force le rôle `leader` uniquement (incompatible avec "Tous")
- [x] Critère "Aléatoire" : critère différent tiré à chaque round (hors Leadership)
- [x] `PoolSizeWarningBanner` : détection pool trop petit, proposition d'adapter drops/rounds automatiquement
- [x] Validation pool intégrée à `canLaunch` (bouton désactivé si pool vide)

### ✅ ImageCropModal — correctifs

- [x] Bug crash drag : capture de `dragStart.current` dans variable locale avant `setCropPos`
- [x] Grille invisible sur fond clair : double outline blanc + noir sur le cropBox, lignes de tiers en gris neutre
- [x] Modal scrollable avec footer toujours visible (`max-height: calc(100vh - 80px)`)

### ✅ Système de crédits images (nouveau)

- [x] Types TypeScript : `AssetCredit`, `ImageCreditInput`, `ImageTransformReport`, `BundleCreditEntry` (`aiModified`, `sourceUrl`)
- [x] `ImageCropModal` : `ImageSourceControl` intégré directement dans le modal (source Wikimedia / Autre, case "Image retouchée par IA")
- [x] `ImagePickerControl` : bouton ✎ pour éditer recadrage ou métadonnées sans re-upload ; normalisation SVG (`.svg.png` → `.svg`) ; rapport de transformation automatique (crop, resize, conversion webp) ; `key={modalKey}` garantit le remount propre du modal à chaque ouverture
- [x] `ImageSourceControl` : 2 badges (Wikimedia / Autre), champ Commons pré-rempli depuis le nom du fichier uploadé, URL optionnelle pour "Autre", case IA
- [x] Contributor : chargement des crédits depuis `credits.json` au montage en mode édition → pré-remplit `coverCredit` et `portraitCredit` de chaque membre
- [x] `buildCredits` : inclusion intelligente — crédit généré si fichier modifié **ou** métadonnées changées ; pas d'écrasement des crédits validés des images non touchées (`loadedCreditsRef`)
- [x] `validate-credits.py` : lookup API Wikimedia Commons (auteur, licence, URL), normalisation `.svg.png`, support type "Autre" avec `sourceUrl`
- [x] `merge-bundle.py` : validation crédits intégrée, `aiModified` et `sourceUrl` stockés, normalisation SVG
- [x] `merge-credits.py` : chemin dataset résolu depuis `REPO_ROOT` (cohérent avec `merge-bundle.py`)
- [x] `CreditsPage` : tableau public, filtre invalides cliquable sur le compteur, colonne transformations (🤖 IA + techniques), première erreur de validation affichée
- [x] `public/dataset/credits.json` : fichier scaffold initialisé
- [x] Footer : `© Skoualy · v0.6.1 · Crédits images` sur toutes les pages Layout

### 🔄 Correctifs restants / connus

- [ ] Intégration `PoolSizeWarningBanner` dans le rendu de `ConfigPage` (patch fourni dans `ConfigPage.patch.md`)
- [ ] `GroupInfoStep` : ajouter `currentCredit={form.coverCredit}` sur l'`ImagePickerControl` de la cover
- [ ] `aiModified` à vérifier dans le pipeline si `validate-credits.py` est appelé indépendamment de `merge-bundle.py`

---

## v0.7 — Blind Test & polish

> Objectif : compléter le second mode de jeu et consolider l'UX globale.

### Blind Test

- [ ] Blind Test — idoles (révélation de portrait après réponse)
- [ ] Blind Test — chansons (saisie texte, validation, révélation)
- [ ] Blind Test — mode 1J & 2J
- [ ] Résumé Blind Test (score, meilleure réponse, erreurs)
- [ ] Blind Test — filtres catégorie / rôles / type chansons

### Config & UX

- [ ] <!-- Correctifs et améliorations ConfigPage identifiés -->
- [ ] <!-- Correctifs et améliorations Contributor identifiés -->
- [ ] <!-- Autres améliorations UX globale -->

### Technique

- [ ] <!-- Refactors ou ajouts techniques prévus -->
- [ ] Tests de non-régression de base (Vitest)

---

## v0.8 — Mode Tournoi & dataset enrichi

> Objectif : introduire le troisième mode de jeu et enrichir le dataset.

### Mode Tournoi *(bientôt disponible)*

- [ ] Définir les règles du mode Tournoi
- [ ] Implémenter le Tournoi — idoles
- [ ] Implémenter le Tournoi — chansons
- [ ] Résumé Tournoi (bracket, vainqueur, historique)

### Dataset & Contributor

- [ ] <!-- Features contributor supplémentaires -->
- [ ] <!-- Enrichissement dataset (nouvelles données, groupes, etc.) -->
- [ ] Validation automatique des bundles côté Python

### UX

- [ ] <!-- Améliorations UX prévues -->

---

## v0.9 — Profils, XP & collections *(preview)*

> Objectif : ajouter une couche de progression et de personnalisation.

### Profils joueur

- [ ] Création de profil (pseudo, avatar)
- [ ] Historique des parties par profil
- [ ] Statistiques globales (groupes les plus sauvés, win rate Blind Test…)

### Système XP

- [ ] Gains XP par mode (multiplicateurs : Chill ×0.5, Classique ×1, Hardcore ×2…)
- [ ] Niveaux et paliers débloquables
- [ ] Affichage XP dans le résumé de partie

### Collections de cartes *(optionnel / à décider)*

- [ ] Concept de cartes d'idoles collectibles
- [ ] Déblocage via parties jouées
- [ ] Galerie de collection

---

## v1.0 — Release publique

> Objectif : version stable, déployée, prête pour des utilisateurs externes.

### Stabilité & performance

- [ ] Audit de performance (bundle size, lazy loading, prefetch)
- [ ] Gestion d'erreurs robuste sur toutes les pages
- [ ] Accessibilité de base (navigation clavier, contrastes, ARIA)
- [ ] Tests E2E critiques (Playwright ou Cypress)

### Déploiement Raspberry Pi 4

- [ ] Build production optimisé (`npm run build`)
- [ ] Configuration Nginx (SPA routing, headers cache)
- [ ] HTTPS via Let's Encrypt (Nginx Proxy Manager)
- [ ] Script de déploiement automatisé
- [ ] Monitoring basique (logs Nginx, uptime)
- [ ] Stratégie de backup (dataset + assets)

### Documentation

- [ ] README utilisateur (installation, lancement, build)
- [ ] Guide de contribution (ajout de groupes, merge Python)
- [ ] Changelog complet v0.6 → v1.0

### Nice to have *(si temps)*

- [ ] Mode hors-ligne (service worker basique)
- [ ] Partage de résultats (screenshot ou lien)

---

## Backlog / Idées futures (post-v1.0)

> À ne pas planifier avant la v1.0 — noter ici pour ne pas oublier.

- [ ] Mode multijoueur en ligne (websockets)
- [ ] Éditeur de dataset intégré (remplace le contributor local)
- [ ] Classements & leaderboards
- [ ] Notifications / achievements
- [ ] Application mobile (PWA ou wrapper natif)
- [ ] Intégration Spotify (pour les extraits, en complément ou remplacement YouTube)
- [ ] …

---

## Notes & décisions techniques

| Date | Décision | Raison |
|------|----------|--------|
| — | React Context à la place de Zustand | Besoin de state global simple, pas de complexité supplémentaire |
| — | YouTube IFrame API (postMessage) pour les extraits | Pas de backend, solution 100% frontend |
| — | Dataset statique servi via Nginx / fetch() | Cohérence dev/prod, pas de backend nécessaire |
| — | Déploiement Raspberry Pi 4 (abandon Electron) | Application web > desktop pour la flexibilité |
| 2026-04 | `key={modalKey}` sur `ImageCropModal` | Seule solution fiable pour passer `initialCredit` à jour — évite les stale closures de `useEffect` |
| 2026-04 | Crédits images dans le bundle contributor | Traçabilité légale des sources (Wikimedia CC, presse) requise avant release publique |
| — | <!-- Ajouter vos décisions ici --> | — |

---

*Dernière mise à jour : avril 2026*
*Version actuelle du projet : **v0.6.1***
