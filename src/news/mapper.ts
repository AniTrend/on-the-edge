import { News, NewsEntity } from './types.d.ts';
import { NewsDocument } from './local/types.d.ts';
import { OptionalId, WithId } from 'npm/mongodb';

export const toEntity = (data: WithId<NewsDocument>): NewsEntity => {
  return {
    id: data._id.toHexString(),
    slug: data.slug,
    title: data.title,
    author: data.author,
    category: data.category,
    description: data.description,
    content: data.content,
    image: data.image,
    publishedOn: data.published_on,
    link: data.link,
  };
};

export const toDocument = (data: News): OptionalId<NewsDocument> => {
  return {
    slug: data.slug,
    title: data.title,
    author: data.author,
    category: data.category,
    description: data.description,
    content: data.content,
    image: data.image,
    published_on: data.publishedOn,
    link: data.link,
  };
};
