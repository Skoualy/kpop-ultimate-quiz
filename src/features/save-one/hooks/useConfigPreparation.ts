import { useCallback, useRef, useState } from 'react'
import type { GameConfig } from '@/shared/models'
import { groupService } from '@/shared/services/groupService'
import { computeMaxRounds, type MaxRoundsResult } from '../helpers/poolScopeRules'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PreparationStatus = 'idle' | 'loading' | 'valid' | 'adjusted' | 'invalid'

interface PrepState {
  status: PreparationStatus
  result: MaxRoundsResult | null
  validatedKey: string | null
  errorMessage: string | null
}

export interface UseConfigPreparationReturn {
  prepared: boolean
  status: PreparationStatus
  result: MaxRoundsResult | null
  errorMessage: string | null
  prepare: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Clé d'invalidation — change dès qu'un paramètre affectant le scope change. */
function buildInvalidationKey(config: GameConfig): string {
  return [
    config.mode,
    config.category,
    config.gamePlayMode,
    // Quick Vote ignore les drops — on normalise à 0 pour la clé
    config.mode === 'quickVote' ? 0 : config.drops,
    config.rounds,
    config.twoPlayerMode ? '2p' : '1p',
    config.criterion,
    config.roleFilters.join(','),
    config.songType,
    config.songLanguage,
    config.selectedGroupIds.slice().sort().join(','),
  ].join('|')
}

const INITIAL_STATE: PrepState = {
  status: 'idle',
  result: null,
  validatedKey: null,
  errorMessage: null,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Prépare et valide la configuration avant le lancement en mode Personnalisé.
 * Calcule le nombre de rounds réellement jouables et clamp si nécessaire.
 */
export function useConfigPreparation(
  config: GameConfig,
  setConfig: (patch: Partial<GameConfig>) => void,
): UseConfigPreparationReturn {
  const [prepState, setPrepState] = useState<PrepState>(INITIAL_STATE)

  const currentKey = buildInvalidationKey(config)
  const isPreparedForCurrent = prepState.validatedKey === currentKey
  const prepared = isPreparedForCurrent && prepState.status !== 'invalid'

  const effectiveStatus: PreparationStatus = isPreparedForCurrent
    ? prepState.status
    : prepState.status === 'loading'
      ? 'loading'
      : 'idle'

  const isLoadingRef = useRef(false)

  // ─── Préparation ─────────────────────────────────────────────────────────

  const prepare = useCallback(async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    const keyAtStart = buildInvalidationKey(config)
    setPrepState((prev) => ({ ...prev, status: 'loading' }))

    try {
      let groups = await groupService.getAll()
      if (config.selectedGroupIds.length > 0) {
        groups = groups.filter((g) => config.selectedGroupIds.includes(g.id))
      }

      // Quick Vote = Save One avec 1 item/round (dropCount forcé à 0)
      const effectiveMode =
        config.mode === 'saveOne' ? 'saveOne' : config.mode === 'quickVote' ? 'quickVote' : 'blindTest'

      const effectiveDrops = config.mode === 'quickVote' ? 0 : config.drops

      const result = computeMaxRounds({
        mode: effectiveMode as 'saveOne' | 'blindTest' | 'quickVote',
        category: config.category,
        groups,
        drops: effectiveDrops,
        rounds: config.rounds,
        twoPlayers: config.twoPlayerMode,
        criterion: config.criterion,
        roleFilters: config.roleFilters,
        songType: config.songType,
        songLanguage: config.songLanguage,
      })

      if (result.maxRounds === 0) {
        setPrepState({
          status: 'invalid',
          result,
          validatedKey: keyAtStart,
          errorMessage:
            result.clampMessage ??
            `Scope insuffisant pour générer une partie. ` +
              `${result.scopeSize} item${result.scopeSize !== 1 ? 's' : ''} disponible${result.scopeSize !== 1 ? 's' : ''}, ` +
              `${result.itemsPerRound} requis par round.`,
        })
        return
      }

      if (result.wasClamped) {
        // Appel direct setConfig(patch), PAS setConfig((prev) => ...)
        // setConfig prend un Partial<GameConfig>, pas une fonction.
        setConfig({ rounds: result.maxRounds })

        const keyAfterClamp = buildInvalidationKey({ ...config, rounds: result.maxRounds })

        setPrepState({
          status: 'adjusted',
          result,
          validatedKey: keyAfterClamp,
          errorMessage: null,
        })
      } else {
        setPrepState({
          status: 'valid',
          result,
          validatedKey: keyAtStart,
          errorMessage: null,
        })
      }
    } catch (e) {
      setPrepState({
        status: 'invalid',
        result: null,
        validatedKey: null,
        errorMessage: e instanceof Error ? e.message : 'Erreur lors de la préparation.',
      })
    } finally {
      isLoadingRef.current = false
    }
  }, [config, setConfig])

  return {
    prepared,
    status: effectiveStatus,
    result: prepared ? prepState.result : null,
    errorMessage: prepState.errorMessage,
    prepare,
  }
}
