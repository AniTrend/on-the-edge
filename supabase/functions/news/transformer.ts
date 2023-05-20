import { logger } from '../_shared/core/logger.ts';
import { generateUUID, toEpotch } from '../_shared/core/utils.ts';
import { News } from './types.d.ts';

const sanitize = (content: string): string => {
  const regex = /<br\s*\/?>|<img.*?\/?>/g;
  return content.replace(regex, '');
};

export const transform = (
  namespace: string,
  // deno-lint-ignore no-explicit-any
  document: Record<string, any>,
): Promise<News[]> => {
  const items = document.rss.channel.item;
  if (!Array.isArray(items)) {
    logger.critical('Unexpected output in news.transformers', document);
    throw Error('Expected array for `document.rss.channel.item`');
  }
  return Promise.all(items.map(async (item) => {
    return {
      id: await generateUUID(namespace, item.guid),
      title: item.title,
      image: item['media:thumbnail']['@url'],
      author: item.author,
      description: sanitize(item.description),
      content: item['content:encoded'],
      link: item.link,
      publishedOn: toEpotch(item.pubDate),
    };
  }));
};
