import { EpisodeCursor } from './episodes.types.ts';

export interface EpisodeQueryParams {
  malId: number; // resolved MAL id (after AniList mapping elsewhere)
  after?: EpisodeCursor;
  before?: EpisodeCursor;
  limit: number;
}

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

export const clampLimit = (raw?: string | null): number => {
  let limit = DEFAULT_LIMIT;
  if (raw != null) {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) limit = parsed;
  }
  if (limit <= 0) return DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) return MAX_LIMIT;
  return limit;
};

export const parseCursor = (raw: string | null): EpisodeCursor | undefined =>
  raw ? raw as EpisodeCursor : undefined;

export const parseBeforeCursor = (
  raw: string | null,
): EpisodeCursor | undefined => raw ? raw as EpisodeCursor : undefined;

export type EpisodeKindFilter =
  | 'main'
  | 'ova'
  | 'ona'
  | 'recap'
  | 'filler'
  | 'special';

export type EpisodeFilters = {
  kind?: EpisodeKindFilter;
  specialsOnly?: boolean;
  start?: number;
  end?: number;
};

export const parseFilters = (params: URLSearchParams): EpisodeFilters => {
  const kind = params.get('kind') as EpisodeKindFilter | null;
  const specialsOnly = params.get('specialsOnly');
  const start = params.get('start');
  const end = params.get('end');
  const filters: EpisodeFilters = {};
  if (
    kind && ['main', 'ova', 'ona', 'recap', 'filler', 'special'].includes(kind)
  ) {
    filters.kind = kind;
  }
  if (specialsOnly === '1' || specialsOnly === 'true') {
    filters.specialsOnly = true;
  }
  if (start && Number.isFinite(Number(start))) filters.start = Number(start);
  if (end && Number.isFinite(Number(end))) filters.end = Number(end);
  return filters;
};
