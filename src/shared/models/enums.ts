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

export type RoleCriterion = 'all' | MemberRole

export type SaveOneCriterion =
  | 'all'
  | 'beauty'
  | 'personality'
  | 'voice'
  | 'performance'
  | 'leadership'
  | 'aegyo'
  | 'random'

// ─── Game enums (alignés sur le legacy) ──────────────────────────────────────

/** Mode de jeu */
export type QuizMode = 'saveOne' | 'blindTest' | 'spectator' | 'chill'

/** Catégorie de contenu jouable */
export type QuizCategory = 'idols' | 'songs'

/** Filtre discographie */
export type SongType = 'all' | 'titles' | 'bSides' | 'debutSongs'

export type GamePhase = 'idle' | 'playing' | 'finished'
export type RevealState = 'hidden' | 'revealed'

export type LanguageOption = 'all' | LanguageCode
