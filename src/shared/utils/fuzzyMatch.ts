/**
 * fuzzyMatch.ts — matching fuzzy pour le Blind Test.
 * Pur TypeScript, sans dépendance externe.
 */

/** Normalise une chaîne : lowercase, sans accents, sans ponctuation, espaces uniques. */
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Normalise + supprime tous les espaces (pour comparaison compacte). */
export function compact(str: string): string {
  return normalize(str).replace(/\s+/g, '')
}

/** Distance de Levenshtein standard (matrice dp). */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Score de similarité entre 0 et 1.
 * - 1.0 : exact (après compactage)
 * - 0.92 : inclusion significative (≥ 3 chars)
 * - sinon : Levenshtein normalisé
 */
export function similarity(input: string, reference: string): number {
  const a = compact(input)
  const b = compact(reference)
  if (!a || !b) return 0
  if (a === b) return 1.0
  if ((b.includes(a) || a.includes(b)) && Math.min(a.length, b.length) >= 3) return 0.92
  const maxLen = Math.max(a.length, b.length)
  return maxLen === 0 ? 1.0 : 1 - levenshtein(a, b) / maxLen
}

/** Retourne true si la similarité dépasse le seuil. */
export function isMatch(input: string, reference: string, threshold: number): boolean {
  return similarity(input, reference) >= threshold
}
