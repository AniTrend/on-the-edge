import { Transform } from '@scope/common/transformer';
import { OtakumodeFeed } from '@scope/service/otakumode';
import { NewsDocument } from './news.document.ts';

export const transform: Transform<OtakumodeFeed, NewsDocument[]> = (
  source,
): NewsDocument[] => {
  return source?.map((item) => {
    return {
      id: item.guid,
      title: item.title,
      link: item.link,
      description: item.description,
      content: item['content:encoded'],
      category: item.category,
      genre: item.genre,
      area: item.area,
      lang: item.lang,
      publishedOn: item.pubDate,
      image: item['media:content']?.url,
      updatedAt: Date.now(),
    };
  }) || [];
};
