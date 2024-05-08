import {
  getPlatformSource,
  isAnalyticsEnabled,
} from '../../common/experiment/index.ts';
import { Transform } from '../../common/transformer/types.d.ts';
import { Features } from '../../common/types/core.d.ts';
import { ConfigDocument } from '../local/types.d.ts';
import { ClientConfiguration } from './types.d.ts';

export const transform: Transform<
  {
    document: ConfigDocument | undefined;
    features: Features;
  },
  ClientConfiguration
> = (data) => {
  const platformSource = getPlatformSource(data.features);
  const image = data.document?.image;
  return {
    id: data.document?._id,
    settings: {
      analyticsEnabled: isAnalyticsEnabled(data.features),
      platformSource: platformSource?.api,
    },
    genres: data.document?.genres,
    image: {
      banner: `${platformSource?.media}${image?.banner}`,
      poster: `${platformSource?.media}${image?.poster}`,
      loading: `${platformSource?.media}${image?.loading}`,
      error: `${platformSource?.media}${image?.error}`,
      info: `${platformSource?.media}${image?.info}`,
      default: `${platformSource?.media}${image?.default}`,
    },
    navigation: data.document?.navigation,
  };
};
