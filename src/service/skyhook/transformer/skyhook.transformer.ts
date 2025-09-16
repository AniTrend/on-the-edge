import { Transform } from '../../../../common/transformer/types.ts';
import { SkyhookModel } from '../remote/types.ts';
import { toInstant } from '../../../../common/helpers/date.ts';
import { SkyhookShow } from '../types.ts';

export const transform: Transform<SkyhookModel, SkyhookShow> = (
  sourceData,
) => ({
  ...sourceData,
  firstAired: toInstant(sourceData.firstAired),
  lastUpdated: toInstant(sourceData.lastUpdated),
  banner: sourceData.images.find((item) => item.coverType == 'Banner')?.url,
  poster: sourceData.images.find((item) => item.coverType == 'Poster')?.url,
  fanart: sourceData.images.find((item) => item.coverType == 'Fanart')?.url,
  seasons: sourceData.seasons.map((season) => ({
    ...season,
    poster: season?.images?.find((item) => item.coverType == 'Poster')?.url,
  })),
});
