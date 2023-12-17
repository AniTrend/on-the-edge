import { logger } from '../common/core/logger.ts';
import { toEpotch } from '../common/core/utils.ts';
import { News } from './types.d.ts';

const sanitize = (content: string): string => {
  const regex = /<br\s*\/?>|<img.*?\/?>/g;
  return content.replace(regex, '');
};

export const transform = (
  // deno-lint-ignore no-explicit-any
  document: Record<string, any>,
): News[] => {
  const items = document.rss.channel.item;
  if (!Array.isArray(items)) {
    logger.critical('Unexpected output in news.transformers', document);
    throw Error('Expected array for `document.rss.channel.item`');
  }
  return items.map((item) => {
    return {
      title: item.title,
      image: item['media:thumbnail']['@url'],
      author: item.author,
      description: sanitize(item.description),
      content: item['content:encoded'],
      link: item.link,
      publishedOn: toEpotch(item.pubDate),
    };
  });
};
