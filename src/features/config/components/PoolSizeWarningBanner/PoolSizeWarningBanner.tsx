import { useMemo } from 'react'
import type { Group } from '@/shared/models'
import type { GameConfig } from '@/shared/models'
import {
  estimateIdolPoolSize,
  estimateSongPoolSize,
  checkPoolFeasibility,
} from '@/features/save-one/helpers/poolSizeEstimator'
import styles from './PoolSizeWarningBanner.module.scss'

interface PoolSizeWarningBannerProps {
  config: GameConfig
  groups: Group[]
  /** Groupes effectivement utilisés (sélectionnés si mode custom, sinon tous) */
  onAdapt: (patch: { drops: number; rounds: number }) => void
}

export function PoolSizeWarningBanner({ config, groups, onAdapt }: PoolSizeWarningBannerProps) {
  // Seulement pour Save One
  if (config.mode !== 'saveOne') return null

  const check = useMemo(() => {
    const poolSize =
      config.category === 'idols'
        ? estimateIdolPoolSize(groups, config.criterion, config.roleFilters)
        : estimateSongPoolSize(groups, config.songType)

    return checkPoolFeasibility(poolSize, config.drops, config.rounds)
  }, [
    groups,
    config.category,
    config.criterion,
    config.roleFilters,
    config.songType,
    config.songLanguage,
    config.drops,
    config.rounds,
  ])

  // Tout est OK → rien à afficher
  if (check.ok && check.maxRoundsNoRecycle >= config.rounds) return null

  // Pool insuffisant même pour 1 round
  if (!check.ok) {
    return (
      <div className={[styles.banner, styles.bannerError].join(' ')}>
        <span className={styles.icon}>⚠️</span>
        <div className={styles.body}>
          <p className={styles.msg}>
            Pool vide — aucun élément ne correspond aux filtres actuels. Élargissez vos groupes ou retirez des filtres.
          </p>
        </div>
      </div>
    )
  }

  // Pool trop petit pour les rounds/drops configurés → recyclage forcé ou impossible
  const adaptDrops = check.minDrops
  const adaptRounds = check.minRounds

  return (
    <div className={[styles.banner, styles.bannerWarn].join(' ')}>
      <span className={styles.icon}>⚠️</span>
      <div className={styles.body}>
        <p className={styles.msg}>
          Les options configurées ({config.rounds} rounds, Drop {config.drops}) dépassent la taille du pool (
          {check.poolSize} éléments). La partie sera jouable mais avec recyclage fréquent.
          {adaptDrops !== config.drops || adaptRounds !== config.rounds ? (
            <> Souhaitez-vous adapter la configuration ?</>
          ) : null}
        </p>
      </div>
      {(adaptDrops !== config.drops || adaptRounds !== config.rounds) && (
        <button
          type="button"
          className={styles.adaptBtn}
          onClick={() => onAdapt({ drops: adaptDrops, rounds: adaptRounds })}
        >
          Adapter ({adaptRounds} round{adaptRounds > 1 ? 's' : ''}, Drop {adaptDrops})
        </button>
      )}
    </div>
  )
}
