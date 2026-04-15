/**
 * Computes a safe random start time for a YouTube clip preview.
 *
 * Strategy:
 * - Avoids the intro (introMargin seconds from start)
 * - Avoids the outro (outroMargin seconds before end)
 * - Ensures enough room for the full clipDuration
 * - Picks randomly from three candidate positions (1/3, 1/2, 2/3) of the playable zone
 *
 * @param duration     Actual or fallback duration in seconds (default: 180)
 * @param clipDuration Length of the clip excerpt in seconds
 * @param introMargin  Seconds to skip at the start (default: 15)
 * @param outroMargin  Seconds to skip before the end (default: 20)
 * @returns            Start time in seconds (always safe to play clipDuration from)
 */
export function computeStartTime(
  duration: number,
  clipDuration: number,
  introMargin = 15,
  outroMargin = 20,
): number {
  const playable = duration - introMargin - outroMargin - clipDuration
  if (playable <= 0) return introMargin

  const candidates = [1 / 3, 1 / 2, 2 / 3].map(
    (ratio) => introMargin + Math.floor(ratio * playable),
  )
  const picked = candidates[Math.floor(Math.random() * 3)]

  // Safety clamp: never go past what allows full clipDuration before outroMargin
  const max = duration - outroMargin - clipDuration
  return Math.max(introMargin, Math.min(picked, max))
}

/** Default duration used when the real video duration is unavailable */
export const DEFAULT_DURATION_SECONDS = 180
