import { News } from './types.d.ts';
import { NewsEntity } from './types.d.ts';

export const fromEntity = (data: NewsEntity): News => {
  return {
    id: data.id,
    title: data.title,
    image: data.image,
    author: data.author,
    description: data.description,
    content: data.content,
    link: data.link,
    publishedOn: data.published_on,
  };
};

export const toEntity = (data: News): NewsEntity => {
  return {
    author: data.author,
    content: data.content,
    description: data.description,
    id: data.id,
    image: data.image,
    link: data.link,
    published_on: data.publishedOn,
    title: data.title,
  };
};
