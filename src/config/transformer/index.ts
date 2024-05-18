import { WithId } from 'npm/mongodb';
import {
  getPlatformSource,
  isAnalyticsEnabled,
} from '../../common/experiment/index.ts';
import { Transform } from '../../common/transformer/types.d.ts';
import { Features } from '../../common/types/core.d.ts';
import { ConfigDocument } from '../local/types.d.ts';
import { ClientConfiguration } from './types.d.ts';
import { PlatformSource } from '../../common/experiment/types.d.ts';
import { idOf } from '../../common/mongo/index.ts';

const toImageUrl = (image: string, source?: PlatformSource): string => {
  if (source) {
    return `${source.media}${image}`;
  }
  return image;
};

export const transform: Transform<
  {
    document: WithId<ConfigDocument>;
    features: Features;
  },
  ClientConfiguration
> = ({ document, features }) => {
  const platformSource = getPlatformSource(features);
  const { image, _id, genres, navigation } = document;
  return {
    id: idOf(_id),
    settings: {
      analyticsEnabled: isAnalyticsEnabled(features),
      platformSource: platformSource?.api,
    },
    genres: genres,
    image: {
      banner: toImageUrl(image.banner, platformSource),
      poster: toImageUrl(image.poster, platformSource),
      loading: toImageUrl(image.loading, platformSource),
      error: toImageUrl(image.error, platformSource),
      info: toImageUrl(image.info, platformSource),
      default: toImageUrl(image.default, platformSource),
    },
    navigation: navigation,
  };
};
