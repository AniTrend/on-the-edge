/**
 * Compute a numeric rank for a cache entry.
 *
 * The rank is computed as: hit * 1000 + (remainingMinutes).
 * remainingMinutes is the remaining time until `expiresAt` in minutes, floored at zero.
 *
 * Higher values indicate entries that are more valuable (more hits or longer time till expiry).
 *
 * @param hit - Number of times the cache entry was hit.
 * @param expiresAt - Optional expiry time in milliseconds since epoch (Date.getTime()) or undefined.
 *                    If undefined the expiry component contributes 0 to the rank.
 * @param now - Current timestamp in milliseconds (defaults to Date.now())
 * @returns A numeric rank combining frequency (hits) and remaining time-to-live (in minutes).
 */
export const computeRank = (
  hit: number,
  expiresAt: number | undefined,
  now = Date.now(),
): number => {
  if (expiresAt === undefined) {
    return hit * 1000;
  }

  const remainingMs = Math.max(0, expiresAt - now);
  const remainingMinutes = Math.floor(remainingMs / (60 * 1000));

  return (hit * 1000) + remainingMinutes;
};
