# Patch ConfigPage.tsx — 3 modifications

## 1. Ajouter l'import (après les autres imports existants)

```tsx
import { PoolSizeWarningBanner } from '@/features/config/components/PoolSizeWarningBanner'
import { checkPoolFeasibility, estimateIdolPoolSize, estimateSongPoolSize } from '@/features/save-one/helpers/poolSizeEstimator'
```

---

## 2. Corriger `handleCriterionChange` (chercher cette fonction et remplacer)

### Avant :
```tsx
function handleCriterionChange(criterion: SaveOneCriterion) {
  const cleaned = filterRolesForCriterion(config.roleFilters, criterion, ROLES)
  setConfig({ criterion, roleFilters: cleaned })
}
```

### Après :
```tsx
function handleCriterionChange(criterion: SaveOneCriterion) {
  // Leadership force le rôle leader — les autres critères nettoient la sélection
  const roleFilters =
    criterion === 'leadership'
      ? (['leader'] as MemberRole[])
      : filterRolesForCriterion(config.roleFilters, criterion, ROLES)
  setConfig({ criterion, roleFilters })
}
```

---

## 3. Ajouter le calcul du pool + mise à jour de `canLaunch`

Ajouter juste **avant** `const canLaunch = ...` :

```tsx
// ── Validation taille du pool (Save One uniquement) ──────────────────────────
const effectiveGroupsForPool = useMemo<Group[]>(() => {
  if (isCustom && config.selectedGroupIds.length > 0) {
    return allGroups.filter((g) => config.selectedGroupIds.includes(g.id))
  }
  return allGroups
}, [isCustom, config.selectedGroupIds, allGroups])

const poolCheck = useMemo(() => {
  if (config.mode !== 'saveOne' || effectiveGroupsForPool.length === 0) return null
  const poolSize =
    config.category === 'idols'
      ? estimateIdolPoolSize(effectiveGroupsForPool, config.criterion, config.roleFilters)
      : estimateSongPoolSize(effectiveGroupsForPool, config.songType)
  return checkPoolFeasibility(poolSize, config.drops, config.rounds)
}, [effectiveGroupsForPool, config.mode, config.category, config.criterion, config.roleFilters, config.songType, config.drops, config.rounds])

const poolInvalid = poolCheck !== null && !poolCheck.ok
```

### Modifier `canLaunch` :
```tsx
const canLaunch = !twoPlayerInvalid && !(isCustom && config.selectedGroupIds.length === 0) && !poolInvalid
```

---

## 4. Ajouter `<PoolSizeWarningBanner>` dans le rendu

Juste **après** le bloc `pageHeaderActions` (le div qui contient les boutons "Lancer" et "Reset"), ajouter :

```tsx
{/* ── Avertissement taille du pool (Save One) ── */}
{config.mode === 'saveOne' && poolCheck && (
  <PoolSizeWarningBanner
    config={config}
    groups={effectiveGroupsForPool}
    onAdapt={(patch) => setConfig(patch)}
  />
)}
```

Ou, si vous préférez l'afficher directement dans la `pageHeader` div, en dessous du div d'actions :

```tsx
<div className={styles.pageHeader}>
  <h1 className={styles.pageTitle}>Configuration</h1>
  <div className={styles.pageHeaderActions}>
    <button className="btn btn--primary" ... >▶ Lancer la partie</button>
    <button className="btn btn--secondary" ... >Reset config</button>
  </div>
  {/* Banner — prend toute la largeur sous les boutons */}
  {config.mode === 'saveOne' && poolCheck && (
    <PoolSizeWarningBanner
      config={config}
      groups={effectiveGroupsForPool}
      onAdapt={(patch) => setConfig(patch)}
    />
  )}
</div>
```

Note : le `<div className={styles.pageHeader}>` doit avoir `flex-wrap: wrap` ou être refait en flex-direction: column pour que le banner s'affiche bien. Ajoutez `flex-direction: column; align-items: stretch;` si nécessaire dans le SCSS.
