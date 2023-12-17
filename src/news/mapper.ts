import { ObjectId } from 'x/mongo';
import { News } from './types.d.ts';
import { NewsDocument } from './local/types.d.ts';

export const fromEntity = (data: NewsDocument): News => {
  return {
    title: data.title,
    image: data.image,
    author: data.author,
    description: data.description,
    content: data.content,
    link: data.link,
    publishedOn: data.publishedOn,
  };
};

export const toEntity = (data: News): NewsDocument => {
  return {
    _id: new ObjectId(data.link),
    author: data.author,
    content: data.content,
    description: data.description,
    image: data.image,
    link: data.link,
    published_on: data.publishedOn,
    title: data.title,
  };
};
