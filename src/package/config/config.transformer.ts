import { Transform } from '@scope/common/transformer';
import { ConfigDocument } from './config.document.ts';
import { Config } from './config.types.ts';
import { PlatformSource } from '@scope/experiment';

const toImageUrl = (image: string, source: PlatformSource): string => {
  if (source) {
    return `${source.media}${image}`;
  }
  return image;
};

/**
 * Derive a stable navigation key from a destination path.
 * Strips leading slashes and replaces path separators with hyphens.
 * Example: "/forum/recent" → "forum-recent"
 */
const keyFromDestination = (destination: string): string =>
  destination.replace(/^\/+/, '').replace(/\//g, '-') || 'unknown';

export const transform: Transform<
  {
    document: ConfigDocument;
    platformSource: PlatformSource;
    isAnalyticsEnabled: boolean;
  },
  Config
> = ({ document, platformSource, isAnalyticsEnabled }) => {
  const { image, _id, genres, navigation } = document;
  return {
    id: _id.toString(),
    settings: {
      analyticsEnabled: isAnalyticsEnabled,
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
    navigation: navigation.map((item) => ({
      ...item,
      key: item.key || keyFromDestination(item.destination),
    })),
  };
};
