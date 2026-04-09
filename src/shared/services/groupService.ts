import type { Group, GroupCategory } from '@/shared/models'

const BASE = '/dataset'

export interface GroupIndexEntry {
  id: string
  category: GroupCategory
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

async function getIndex(): Promise<GroupIndexEntry[]> {
  return fetchJson<GroupIndexEntry[]>(`${BASE}/groups/index.json`)
}

async function getAll(): Promise<Group[]> {
  const index = await getIndex()
  const results = await Promise.allSettled(
    index.map(({ id, category }) =>
      fetchJson<Group>(`${BASE}/groups/${category}/${id}.json`),
    ),
  )

  const rejectedCount = results.filter((entry) => entry.status === 'rejected').length
  if (rejectedCount === results.length && results.length > 0) {
    throw new Error('Impossible de charger les groupes. Vérifie le dataset groups/index.json.')
  }

  return results
    .filter((entry): entry is PromiseFulfilledResult<Group> => entry.status === 'fulfilled')
    .map((entry) => entry.value)
}

async function getById(id: string, category: GroupCategory): Promise<Group | null> {
  try {
    return await fetchJson<Group>(`${BASE}/groups/${category}/${id}.json`)
  } catch {
    return null
  }
}

async function getSubUnits(parentId: string): Promise<Group[]> {
  const all = await getAll()
  return all.filter((group) => group.parentGroupId === parentId)
}

export const groupService = { getAll, getById, getSubUnits, getIndex }
