import type {
  Group,
  Idol,
  Label,
  ResolvedGroup,
  ResolvedMember,
  GroupCategory,
  MemberRole,
  SongEntry,
  GameItem,
  IdolGameItem,
  SongGameItem,
  GameConfig,
} from '../types';

// ─── Static imports ────────────────────────────────────────────────────────────

import twiceData from '../data/groups/twice.json';
import misamoData from '../data/groups/misamo.json';
import nayeonData from '../data/groups/nayeon.json';
import idolsData from '../data/idols.json';
import labelsData from '../data/labels.json';

// ─── Raw data ─────────────────────────────────────────────────────────────────

export const ALL_GROUPS: Group[] = [twiceData as Group, misamoData as Group, nayeonData as Group];

export const ALL_IDOLS: Idol[] = idolsData as Idol[];
export const ALL_LABELS: Label[] = (labelsData as { labels: Label[] }).labels;

// ─── Lookup maps ──────────────────────────────────────────────────────────────

export function buildIdolMap(idols: Idol[]): Map<string, Idol> {
  return new Map(idols.map((i) => [i.id, i]));
}

// ─── Resolution ───────────────────────────────────────────────────────────────

export function resolveGroup(group: Group, idolMap: Map<string, Idol>): ResolvedGroup {
  const members: ResolvedMember[] = group.members.flatMap((m) => {
    const idol = idolMap.get(m.idolId);
    if (!idol) return [];
    return [{ idol, membership: m }];
  });
  return { ...group, members };
}

export function resolveAllGroups(groups: Group[], idols: Idol[]): ResolvedGroup[] {
  const idolMap = buildIdolMap(idols);
  return groups.map((g) => resolveGroup(g, idolMap));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCategoryLabel(cat: GroupCategory): string {
  const map: Record<GroupCategory, string> = {
    girlGroup: 'Girl group',
    boyGroup: 'Boy group',
    femaleSoloist: 'Soliste (F)',
    maleSoloist: 'Soliste (H)',
  };
  return map[cat];
}

export function getCategoryGender(cat: GroupCategory): 'f' | 'm' {
  return cat === 'girlGroup' || cat === 'femaleSoloist' ? 'f' : 'm';
}

export function getRoleLabel(role: MemberRole): string {
  const map: Record<MemberRole, string> = {
    leader: 'Leader',
    mainVocal: 'Main Vocal',
    vocal: 'Vocal',
    mainDancer: 'Main Dancer',
    dancer: 'Dancer',
    mainRapper: 'Main Rapper',
    rapper: 'Rapper',
    visual: 'Visual',
    maknae: 'Maknae',
  };
  return map[role];
}

export function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Idol ID generation ────────────────────────────────────────────────────────

export function generateIdolId(name: string, existingIdols: Idol[]): string {
  const base = slugify(name);
  if (!existingIdols.find((i) => i.id === base)) return base;
  let n = 2;
  while (existingIdols.find((i) => i.id === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// ─── Song pool builder ────────────────────────────────────────────────────────

export function buildSongPool(groups: Group[], songType: GameConfig['songType']): SongGameItem[] {
  const items: SongGameItem[] = [];
  for (const group of groups) {
    const songs: SongEntry[] = [];
    if (songType === 'all' || songType === 'titles') songs.push(...group.discography.titles);
    if (songType === 'all' || songType === 'bSides') songs.push(...group.discography.bSides);
    for (const song of songs) {
      if (song.youtubeUrl) items.push({ type: 'song', song, group });
    }
  }
  return items;
}

// ─── Idol pool builder ────────────────────────────────────────────────────────

export function buildIdolPool(groups: Group[], idolMap: Map<string, Idol>, config: GameConfig): IdolGameItem[] {
  const seen = new Set<string>();
  const items: IdolGameItem[] = [];
  const performanceRoles: MemberRole[] = ['mainVocal', 'vocal', 'mainDancer', 'dancer', 'mainRapper', 'rapper'];

  for (const group of groups) {
    for (const member of group.members) {
      if (seen.has(member.idolId)) continue;
      const idol = idolMap.get(member.idolId);
      if (!idol) continue;

      // Role filter
      if (config.roleFilter !== 'all' && !member.roles.includes(config.roleFilter)) continue;

      // Criterion filter
      if (config.criterion === 'leadership' && !member.roles.includes('leader')) continue;
      if (config.criterion === 'performance') {
        const hasPerf = member.roles.some((r) => performanceRoles.includes(r));
        if (!hasPerf) continue;
      }

      seen.add(member.idolId);
      items.push({ type: 'idol', idol, group, memberStatus: member.status });
    }
  }
  return items;
}

// ─── Shuffle ───────────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Game pool ────────────────────────────────────────────────────────────────

export function buildGamePool(groups: Group[], idols: Idol[], config: GameConfig): GameItem[] {
  const idolMap = buildIdolMap(idols);
  const selectedGroups = groups.filter((g) => config.selectedGroupIds.includes(g.id));

  if (config.category === 'songs') {
    return shuffle(buildSongPool(selectedGroups, config.songType));
  }
  return shuffle(buildIdolPool(selectedGroups, idolMap, config));
}

// ─── Sub-unit detection ───────────────────────────────────────────────────────

export function isTopLevel(group: Group): boolean {
  return group.parentGroupId === null;
}

export function isSoloist(group: Group): boolean {
  return group.category === 'femaleSoloist' || group.category === 'maleSoloist';
}

export function getMemberCountLabel(group: Group): string {
  const current = group.members.filter((m) => m.status === 'current').length;
  const former = group.members.filter((m) => m.status === 'former').length;
  return former > 0 ? `${current} membres (+${former})` : `${current} membre${current > 1 ? 's' : ''}`;
}

export function getSongCountLabel(group: Group): string {
  const total = group.discography.titles.length + group.discography.bSides.length;
  return `${total} chanson${total > 1 ? 's' : ''}`;
}
