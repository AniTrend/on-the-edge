import { logger } from '../common/core/logger.ts';
import { toEpotch } from '../common/core/utils.ts';
import { News } from './types.d.ts';

const sanitize = (content: string): string => {
  const regex = /<br\s*\/?>|<img.*?\/?>/g;
  return content.replace(regex, '');
};

const extractSlug = (uri: string): string => {
  const url = new URL(uri);
  const pathname = url.pathname;
  const pathSegments = pathname.split('/');
  return pathSegments[pathSegments.length - 1];
};

export const transform = (
  // deno-lint-ignore no-explicit-any
  document: Record<string, any>,
): News[] => {
  const items = document.rss.channel.item;
  if (!Array.isArray(items)) {
    logger.critical(
      'news.transformer:transform: Unexpected output in news.transformers',
      document,
    );
    throw Error(
      'news.transformer:transform: Expected array for `document.rss.channel.item`',
    );
  }
  return items.map((item) => {
    return {
      slug: extractSlug(item.guid),
      title: item.title,
      author: item.author,
      category: item.category,
      description: sanitize(item.description),
      content: item['content:encoded'],
      image: item['media:thumbnail']['@url'],
      publishedOn: toEpotch(item.pubDate),
      link: item.link,
    };
  });
};
