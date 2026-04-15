export interface ClipStartOptions {
  durationSeconds?: number
  clipDurationSeconds: number
  introMarginSeconds?: number
  outroMarginSeconds?: number
  fallbackDurationSeconds?: number
}

/**
 * Calcule un timestamp de départ robuste pour un extrait YouTube.
 * Ne démarre jamais systématiquement au début.
 */
export function computeSongClipStart({
  durationSeconds,
  clipDurationSeconds,
  introMarginSeconds = 15,
  outroMarginSeconds = 20,
  fallbackDurationSeconds = 180,
}: ClipStartOptions): number {
  const safeDuration = Math.max(durationSeconds ?? fallbackDurationSeconds, clipDurationSeconds + 1)
  const minStart = Math.max(0, introMarginSeconds)
  const maxStart = Math.max(minStart, safeDuration - outroMarginSeconds - clipDurationSeconds)

  if (maxStart <= minStart) return minStart

  const oneThird = Math.floor(safeDuration / 3)
  const half = Math.floor(safeDuration / 2)
  const twoThird = Math.floor((safeDuration * 2) / 3)
  const candidates = [oneThird, half, twoThird].map((candidate) => Math.min(maxStart, Math.max(minStart, candidate)))

  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  return Math.min(maxStart, Math.max(minStart, pick))
}
