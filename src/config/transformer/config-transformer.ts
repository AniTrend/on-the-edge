import { WithId } from '@mongodb';
import {
  getPlatformSource,
  isAnalyticsEnabled,
} from '@scope/common/experiment';
import { Transform } from '@scope/common/transformer';
import { Features } from '@scope/common/types';
import { idOf } from '@scope/common/mongo';
import { PlatformSource } from '@scope/common/experiment';
import { ConfigDocument } from '../local/types.ts';
import { ClientConfiguration } from './types.ts';

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
