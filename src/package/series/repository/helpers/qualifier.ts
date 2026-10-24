import type { Jikan, JikanAnime, JikanManga } from '@scope/service/jikan';
import { MediaKind } from '../../series.types.ts';

export const isJikanAnime = (
  resource?: Jikan | null,
): resource is JikanAnime => resource != null && 'airing' in resource;

export const isJikanManga = (
  resource?: Jikan | null,
): resource is JikanManga => resource != null && 'publishing' in resource;

export const inferMediaKind = (resource?: Jikan | null): MediaKind | null => {
  if (isJikanAnime(resource)) return 'ANIME';
  if (isJikanManga(resource)) return 'MANGA';
  return null;
};
