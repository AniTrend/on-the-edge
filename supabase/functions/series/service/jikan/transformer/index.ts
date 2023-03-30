import { AnimeResource, MangaResource } from '../remote/types.d.ts';
import { JikanManga, JikanShow } from '../types.d.ts';
import { Transform } from '../../../transformer/types.d.ts';

export const animeTransform: Transform<AnimeResource, JikanShow> = (
  sourceData,
): JikanShow => ({
  ...sourceData,
});

export const mangaTransform: Transform<MangaResource, JikanManga> = (
  sourceData,
): JikanManga => ({
  ...sourceData,
});
