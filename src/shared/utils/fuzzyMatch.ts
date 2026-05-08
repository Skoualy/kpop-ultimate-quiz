// Fuzzy matching for blind test answers — pure TS, no external dependencies.

export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9 ]/g, '')      // keep alphanumeric + space only
    .replace(/\s+/g, ' ')
    .trim()
}

export function compact(str: string): string {
  return normalize(str).replace(/\s+/g, '')
}

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

export function similarity(input: string, reference: string): number {
  const a = compact(input)
  const b = compact(reference)
  if (a === b) return 1.0
  const minLen = Math.min(a.length, b.length)
  if (minLen >= 3 && (b.includes(a) || a.includes(b))) return 0.92
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1.0
  return 1 - levenshtein(a, b) / maxLen
}

export function isMatch(input: string, reference: string, threshold: number): boolean {
  return similarity(input, reference) >= threshold
}
