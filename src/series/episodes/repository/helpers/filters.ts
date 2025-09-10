import type { EpisodeCanonical } from '../../episodes.types.ts';

export type EpisodeFilters = {
  kind?: string;
  specialsOnly?: boolean;
  start?: number;
  end?: number;
};

export function applyFilters(
  episodes: EpisodeCanonical[],
  f?: EpisodeFilters,
): EpisodeCanonical[] {
  if (!f) return episodes;
  let merged = episodes;
  if (f.kind) {
    merged = merged.filter((e) => (e.kind ?? undefined) === f.kind);
  }
  if (f.specialsOnly) {
    merged = merged.filter((
      e,
    ) => (e.kind === 'ova' || e.kind === 'ona' || e.kind === 'recap' ||
      e.kind === 'filler' || e.kind === 'special')
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
