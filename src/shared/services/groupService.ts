import type { Group, GroupCategory } from '@/shared/models'

const BASE = '/dataset'

interface GroupIndexEntry {
  id:       string
  category: GroupCategory
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

async function getAll(): Promise<Group[]> {
  try {
    const index = await fetchJson<GroupIndexEntry[]>(`${BASE}/groups/index.json`)
    const results = await Promise.allSettled(
      index.map(({ id, category }) =>
        fetchJson<Group>(`${BASE}/groups/${category}/${id}.json`),
      ),
    )
    return results
      .filter((r): r is PromiseFulfilledResult<Group> => r.status === 'fulfilled')
      .map((r) => r.value)
  } catch {
    return []
  }
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
  return all.filter((g) => g.parentGroupId === parentId)
}

export const groupService = { getAll, getById, getSubUnits }
