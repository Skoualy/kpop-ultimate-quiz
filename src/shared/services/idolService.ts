import type { Group, Idol } from '@/shared/models'

const BASE = '/dataset'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

async function getAll(): Promise<Idol[]> {
  try {
    return await fetchJson<Idol[]>(`${BASE}/idols.json`)
  } catch {
    return []
  }
}

async function getByIds(ids: string[]): Promise<Idol[]> {
  const all = await getAll()
  const set = new Set(ids)
  return all.filter((idol) => set.has(idol.id))
}

function resolveMembers(group: Group, allIdols: Idol[]): Idol[] {
  const idolMap = new Map(allIdols.map((i) => [i.id, i]))
  return group.members
    .map((m) => idolMap.get(m.idolId))
    .filter((i): i is Idol => i !== undefined)
}

export const idolService = { getAll, getByIds, resolveMembers }
