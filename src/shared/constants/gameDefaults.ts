import type { GameConfig } from '@/shared/models'

export const DEFAULT_GAME_CONFIG: GameConfig = {
  mode: 'saveOne',
  gamePlayMode: 'classic',
  category: 'idols',
  rounds: 10,
  timerSeconds: 15,
  clipDuration: 10,
  drops: 2,
  criterion: 'all',
  roleFilters: [],
  songType: 'all',
  songLanguage: 'all',
  twoPlayerMode: false,
  player1Name: 'Joueur 1',
  player2Name: 'Joueur 2',
  selectedGroupIds: [],
}
