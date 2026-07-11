import type { EpisodeCanonical, EpisodeFilters } from '../../episodes.types.ts';

/**
 * Apply filters to episode array
 * @param episodes Array of canonical or merged episodes
 * @param f Filter criteria (kind, specialsOnly, start, end)
 * @returns Filtered episode array
 */
export function applyFilters<T extends EpisodeCanonical>(
  episodes: T[],
  f?: EpisodeFilters,
): T[] {
  if (!f) return episodes;
  let merged = episodes;

  if (f.kind) {
    merged = merged.filter((e) => (e.kind ?? undefined) === f.kind);
  }

  if (f.specialsOnly) {
    merged = merged.filter((e) =>
      e.kind === 'OVA' ||
      e.kind === 'ONA' ||
      e.kind === 'RECAP' ||
      e.kind === 'FILLER' ||
      e.kind === 'SPECIAL'
    );
  }

  if (typeof f.start === 'number') {
    merged = merged.filter((e) => (e.number ?? e.id) >= f.start!);
  }

  if (typeof f.end === 'number') {
    merged = merged.filter((e) => (e.number ?? e.id) <= f.end!);
  }

  return merged;
}
