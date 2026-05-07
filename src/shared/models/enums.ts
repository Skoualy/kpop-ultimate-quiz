// ─── Entités dataset ──────────────────────────────────────────────────────────

export type GroupCategory = 'girlGroup' | 'boyGroup' | 'femaleSoloist' | 'maleSoloist'
export type GroupStatus = 'active' | 'inactive'
export type MemberStatus = 'current' | 'former'
export type IdolGender = 'f' | 'm'
export type Generation = '1' | '2' | '3' | '4' | '5'
export type NationalityCode = 'kr' | 'jp' | 'cn' | 'tw' | 'th' | 'us' | 'au'
export type LanguageCode = 'kr' | 'jp' | 'en'

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

export type SaveOneCriterion =
  | 'all'
  | 'beauty'
  | 'personality'
  | 'voice'
  | 'performance'
  | 'leadership'
  | 'aegyo'
  | 'random'

// ─── Game enums ───────────────────────────────────────────────────────────────

/** Mode de jeu principal */
export type QuizMode = 'saveOne' | 'blindTest' | 'quickVote' | 'spectator' | 'chill'

/** Catégorie de contenu jouable */
export type QuizCategory = 'idols' | 'songs'

/** Filtre discographie */
export type SongType = 'all' | 'titles' | 'bSides' | 'debutSongs'

export type GamePhase = 'idle' | 'playing' | 'finished'
export type RevealState = 'hidden' | 'revealed'

export type LanguageOption = 'all' | LanguageCode

/**
 * Mode de jeu personnalisé (Classique, Chill, Spectateur, Hardcore, Personnalisé).
 * Déplacé depuis GameConfig.ts et gameModes.ts — source unique dans enums.ts.
 */
export type GamePlayMode = 'classic' | 'chill' | 'spectator' | 'hardcore' | 'custom'
