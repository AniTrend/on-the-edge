import { AnimeResource, MangaResource } from '../remote/types.d.ts';
import { JikanAnime, JikanManga } from '../types.d.ts';
import { Transform } from '../../../../common/transformer/types.d.ts';

export const animeTransform: Transform<AnimeResource, JikanAnime> = (
  sourceData,
): JikanAnime => ({
  ...sourceData,
});

export const mangaTransform: Transform<MangaResource, JikanManga> = (
  sourceData,
): JikanManga => ({
  ...sourceData,
});
