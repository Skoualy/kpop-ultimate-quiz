// ─── Enums ───────────────────────────────────────────────────────────────────

export type GroupCategory =
  | 'girlGroup'
  | 'boyGroup'
  | 'femaleSoloist'
  | 'maleSoloist';

export type GroupStatus = 'active' | 'inactive';

export type MemberStatus = 'current' | 'former';

export type IdolGender = 'f' | 'm';

export type Generation = '1' | '2' | '3' | '4' | '5';

export type NationalityCode = 'kr' | 'jp' | 'cn' | 'tw' | 'th' | 'us' | 'au';

export type LanguageCode = 'jp' | 'en';

export type MemberRole =
  | 'leader'
  | 'mainVocal'
  | 'vocal'
  | 'mainDancer'
  | 'dancer'
  | 'mainRapper'
  | 'rapper'
  | 'visual'
  | 'maknae';

export type SaveOneCriterion =
  | 'all'
  | 'beauty'
  | 'personality'
  | 'voice'
  | 'performance'
  | 'leadership'
  | 'random';

export type QuizMode = 'blindTest' | 'saveOne';

export type QuizCategory = 'songs' | 'idols';

export type SongType = 'all' | 'titles' | 'bSides';

// ─── Dataset types ────────────────────────────────────────────────────────────

export interface Idol {
  id: string;
  name: string;
  primaryGroupId: string;
  gender: IdolGender;
  nationality: NationalityCode;
  portrait?: string | null;
  fandomUrl?: string | null;
  notes?: string | null;
}

export interface GroupMember {
  idolId: string;
  status: MemberStatus;
  roles: MemberRole[];
}

export interface SongEntry {
  id: string;
  title: string;
  youtubeUrl: string;
  language?: LanguageCode;
  isDebutSong?: boolean;
}

export interface Discography {
  titles: SongEntry[];
  bSides: SongEntry[];
}

export interface Group {
  id: string;
  name: string;
  category: GroupCategory;
  parentGroupId: string | null;
  generation: Generation;
  debutYear: number;
  status: GroupStatus;
  company: string;
  coverImage?: string | null;
  members: GroupMember[];
  discography: Discography;
  fandomName?: string | null;
  fandomUrl?: string | null;
  notes?: string | null;
}

export interface Label {
  id: string;
  name: string;
  country: string;
  logo?: string | null;
}

// ─── Resolved types (runtime) ─────────────────────────────────────────────────

export interface ResolvedMember {
  idol: Idol;
  membership: GroupMember;
}

export interface ResolvedGroup extends Omit<Group, 'members'> {
  members: ResolvedMember[];
}

// ─── Game config ──────────────────────────────────────────────────────────────

export interface GameConfig {
  mode: QuizMode;
  category: QuizCategory;
  rounds: number;
  timerEnabled: boolean;
  timerSeconds: number;
  clipDuration: number;
  drops: number;
  criterion: SaveOneCriterion;
  roleFilter: MemberRole | 'all';
  songType: SongType;
  twoPlayerMode: boolean;
  player1Name: string;
  player2Name: string;
  selectedGroupIds: string[];
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  mode: 'saveOne',
  category: 'idols',
  rounds: 10,
  timerEnabled: false,
  timerSeconds: 10,
  clipDuration: 5,
  drops: 2,
  criterion: 'all',
  roleFilter: 'all',
  songType: 'all',
  twoPlayerMode: false,
  player1Name: 'Joueur 1',
  player2Name: 'Joueur 2',
  selectedGroupIds: [],
};

// ─── Game state ───────────────────────────────────────────────────────────────

export interface IdolGameItem {
  type: 'idol';
  idol: Idol;
  group: Group;
  memberStatus: MemberStatus;
}

export interface SongGameItem {
  type: 'song';
  song: SongEntry;
  group: Group;
}

export type GameItem = IdolGameItem | SongGameItem;

// ─── Contributor types ────────────────────────────────────────────────────────

export interface IdolResolution {
  mode: 'existing' | 'new';
  selectedExistingId?: string | null;
  resolvedId?: string | null;
}

export interface EditableMemberRow {
  _uiKey: string;
  idol: {
    id?: string;
    name: string;
    nationality: NationalityCode;
    portrait?: string | null;
    fandomUrl?: string | null;
    notes?: string | null;
  };
  membership: {
    status: MemberStatus;
    roles: MemberRole[];
  };
  idolResolution: IdolResolution;
}

export interface ContributionBundleMeta {
  schemaVersion: number;
  generatedAt: string;
}

export interface ContributionBundle {
  meta: ContributionBundleMeta;
  group: Group;
  idols: Idol[];
}
