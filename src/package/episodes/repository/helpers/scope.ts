/**
 * Scope derivation helpers for filtering episodes.
 *
 * Determines series airing status and calculates appropriate cache TTL.
 */

/**
 * Determine if a series is currently airing based on episode air dates.
 *
 * Logic:
 * - If any episode has null aired date, assume airing
 * - If latest episode aired within last 7 days, assume airing
 * - Otherwise, completed
 *
 * @param episodes Array of episodes with aired dates (epoch seconds)
 * @returns True if series is airing
 */
export function deriveAiringStatus(
  episodes: Array<{ aired?: number | null | undefined }>,
): boolean {
  if (episodes.length === 0) return false;

  // Check for any null/undefined aired dates
  const hasUnaired = episodes.some((ep) => ep.aired == null);
  if (hasUnaired) return true;

  // Find latest aired episode
  const aired = episodes
    .map((ep) => ep.aired)
    .filter((date): date is number => date !== null && date !== undefined)
    .sort((a, b) => b - a);

  if (aired.length === 0) return false;

  const latest = aired[0];
  const now = Math.floor(Date.now() / 1000); // Convert to epoch seconds
  const sevenDaysAgo = now - 7 * 24 * 60 * 60;

  return latest > sevenDaysAgo;
}

/**
 * Calculate cache TTL based on airing status.
 *
 * @param airing True if series is currently airing
 * @returns TTL in hours
 */
export function calculateTTL(airing: boolean): number {
  // Airing: 12 hours
  // Completed: 7 days (168 hours)
  return airing ? 12 : 168;
}
