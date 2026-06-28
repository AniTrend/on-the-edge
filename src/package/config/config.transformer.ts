import { Transform } from '@scope/common/transformer';
import { ConfigDocument, NavigationItemInput } from './config.document.ts';
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

/**
 * Sort navigation items by group.rank ascending, then by item rank
 * ascending. Items with undefined ranks sort last. The item key is
 * used as a tiebreaker for deterministic ordering.
 */
export function sortNavigation(
  navigation: NavigationItemInput[],
): NavigationItemInput[] {
  const sorted = [...navigation];
  sorted.sort((a, b) => {
    const groupRankA = a.group?.rank ?? Number.MAX_SAFE_INTEGER;
    const groupRankB = b.group?.rank ?? Number.MAX_SAFE_INTEGER;
    if (groupRankA !== groupRankB) return groupRankA - groupRankB;
    const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return (a.key ?? '').localeCompare(b.key ?? '');
  });
  return sorted;
}

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
    navigation: sortNavigation(navigation).map((item) => ({
      criteria: item.criteria,
      destination: item.destination,
      i18n: item.i18n,
      icon: item.icon,
      group: {
        authenticated: item.group?.authenticated ?? false,
        i18n: item.group?.i18n ?? '',
      },
      key: item.key || keyFromDestination(item.destination),
    })),
  };
};
