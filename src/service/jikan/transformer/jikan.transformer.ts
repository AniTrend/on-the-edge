import { AnimeResource, MangaResource } from '../remote/types.ts';
import { JikanAnime, JikanManga } from '../types.ts';
import { Transform } from '@scope/common/transformer';

export const animeTransform: Transform<AnimeResource, JikanAnime> = (
  sourceData,
): JikanAnime => ({
  ...sourceData,
  moreinfo: sourceData.moreinfo ?? null,
});

export const mangaTransform: Transform<MangaResource, JikanManga> = (
  sourceData,
): JikanManga => ({
  ...sourceData,
  moreinfo: sourceData.moreinfo ?? null,
});
