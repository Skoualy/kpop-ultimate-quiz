export interface PreviewTimestampOptions {
  clipDuration: number
  totalDurationSeconds?: number | null
}

const DEFAULT_DURATION_SECONDS = 180
const INTRO_SAFETY_SECONDS = 8
const OUTRO_SAFETY_SECONDS = 12

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Returns a safe random timestamp picked from 1/3, 1/2 or 2/3 of the song duration.
 * Falls back to 180s when real duration is not available.
 */
export function getSafePreviewStartTimestamp({
  clipDuration,
  totalDurationSeconds,
}: PreviewTimestampOptions): number {
  const duration = totalDurationSeconds && totalDurationSeconds > 0
    ? totalDurationSeconds
    : DEFAULT_DURATION_SECONDS

  const candidates = [duration / 3, duration / 2, (duration * 2) / 3]
  const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)]

  const minimumStart = INTRO_SAFETY_SECONDS
  const maximumStart = Math.max(minimumStart, duration - OUTRO_SAFETY_SECONDS - clipDuration)

  const withSafety = clamp(randomCandidate, minimumStart, maximumStart)
  return Math.floor(withSafety)
}
