/**
 * useConfigPreparation.ts
 *
 * Hook de préparation/validation de config pour le mode Personnalisé.
 *
 * Flux UX :
 *   idle → [clic Préparer] → loading → valid | adjusted | invalid
 *   Tout changement de config pertinent invalide la préparation → idle
 *
 * Invalidation automatique :
 *   La préparation est valide uniquement pour la config qui a été validée.
 *   Si la config change, `prepared` redevient false automatiquement
 *   en comparant la clé courante et la clé validée (pas de useEffect requis).
 */

import { useCallback, useRef, useState } from 'react'
import type { GameConfig } from '@/shared/models'
import { computeMaxRounds, type MaxRoundsResult } from '../helpers/poolScopeRules'
import { groupService } from '@/shared/services/groupService'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PreparationStatus = 'idle' | 'loading' | 'valid' | 'adjusted' | 'invalid'

export interface UseConfigPreparationReturn {
  /** true uniquement si la config courante a été validée avec succès */
  prepared: boolean
  /** Statut de la dernière tentative de préparation */
  status: PreparationStatus
  /** Résultat du calcul de scope (disponible après préparation réussie) */
  result: MaxRoundsResult | null
  /** Message d'erreur si status === 'invalid' */
  errorMessage: string | null
  /** Lance la préparation */
  prepare: () => Promise<void>
}

// ─── Clé d'invalidation ───────────────────────────────────────────────────────

/**
 * Clé stable représentant tous les paramètres qui impactent la faisabilité.
 * Si cette clé change après une préparation, la préparation est invalidée.
 */
function buildInvalidationKey(config: GameConfig): string {
  return JSON.stringify({
    mode:             config.mode,
    gamePlayMode:     config.gamePlayMode,
    category:         config.category,
    drops:            config.drops,
    rounds:           config.rounds,
    twoPlayerMode:    config.twoPlayerMode,
    criterion:        config.criterion,
    roleFilters:      [...config.roleFilters].sort(),
    songType:         config.songType,
    selectedGroupIds: [...config.selectedGroupIds].sort(),
  })
}

// ─── État interne ─────────────────────────────────────────────────────────────

interface PrepState {
  status:       PreparationStatus
  result:       MaxRoundsResult | null
  errorMessage: string | null
  /** Clé de config validée — comparée à currentKey pour l'invalidation */
  validatedKey: string | null
}

const INITIAL_STATE: PrepState = {
  status:       'idle',
  result:       null,
  errorMessage: null,
  validatedKey: null,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param config     Config courante (depuis GameContext)
 * @param setConfig  Setter partiel du GameContext — DOIT être `(patch: Partial<GameConfig>) => void`
 *                   Ne pas passer un setter React fonctionnel : setConfig((prev) => ...) est invalide ici.
 */
export function useConfigPreparation(
  config: GameConfig,
  setConfig: (patch: Partial<GameConfig>) => void,
): UseConfigPreparationReturn {
  const [prepState, setPrepState] = useState<PrepState>(INITIAL_STATE)

  // Clé courante de la config (calculée à chaque render, sans mémorisation)
  const currentKey             = buildInvalidationKey(config)
  const isPreparedForCurrent   = prepState.validatedKey === currentKey
  const prepared               = isPreparedForCurrent && prepState.status !== 'invalid'

  const effectiveStatus: PreparationStatus = isPreparedForCurrent
    ? prepState.status
    : prepState.status === 'loading'
      ? 'loading'
      : 'idle'

  const isLoadingRef = useRef(false)

  // ─── Préparation ────────────────────────────────────────────────────────────

  const prepare = useCallback(async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    const keyAtStart = buildInvalidationKey(config)
    setPrepState((prev) => ({ ...prev, status: 'loading' }))

    try {
      // Charger les groupes selon le scope courant
      let groups = await groupService.getAll()
      if (config.selectedGroupIds.length > 0) {
        groups = groups.filter((g) => config.selectedGroupIds.includes(g.id))
      }

      const result = computeMaxRounds({
        mode:        config.mode === 'saveOne' ? 'saveOne' : 'blindTest',
        category:    config.category,
        groups,
        drops:       config.drops,
        rounds:      config.rounds,
        twoPlayers:  config.twoPlayerMode,
        criterion:   config.criterion,
        roleFilters: config.roleFilters,
        songType:    config.songType,
      })

      if (result.maxRounds === 0) {
        setPrepState({
          status:       'invalid',
          result,
          validatedKey: keyAtStart,
          errorMessage: result.clampMessage ??
            `Scope insuffisant pour générer une partie. ` +
            `${result.scopeSize} item${result.scopeSize !== 1 ? 's' : ''} disponible${result.scopeSize !== 1 ? 's' : ''}, ` +
            `${result.itemsPerRound} requis par round.`,
        })
        return
      }

      if (result.wasClamped) {
        // FIX : appel direct setConfig(patch), PAS setConfig((prev) => ...)
        // setConfig prend un Partial<GameConfig>, pas une fonction.
        setConfig({ rounds: result.maxRounds })

        // La clé validée tient compte du nouveau nombre de rounds
        const keyAfterClamp = buildInvalidationKey({ ...config, rounds: result.maxRounds })

        setPrepState({
          status:       'adjusted',
          result,
          validatedKey: keyAfterClamp,
          errorMessage: null,
        })
      } else {
        setPrepState({
          status:       'valid',
          result,
          validatedKey: keyAtStart,
          errorMessage: null,
        })
      }

    } catch (e) {
      setPrepState({
        status:       'invalid',
        result:       null,
        validatedKey: null,
        errorMessage: e instanceof Error ? e.message : 'Erreur lors de la préparation.',
      })
    } finally {
      isLoadingRef.current = false
    }
  }, [config, setConfig])

  return {
    prepared,
    status:       effectiveStatus,
    result:       prepared ? prepState.result : null,
    errorMessage: prepState.errorMessage,
    prepare,
  }
}
